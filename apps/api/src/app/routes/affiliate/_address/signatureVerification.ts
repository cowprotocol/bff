import { logger } from '@cowprotocol/shared';
import {
  Address,
  hashTypedData,
  isHex,
  PublicClient,
  verifyTypedData,
} from 'viem';

const EIP1271_MAGIC_VALUE = '0x1626ba7e';

const EIP1271_ABI = [
  {
    type: 'function',
    name: 'isValidSignature',
    stateMutability: 'view',
    inputs: [
      { name: '_hash', type: 'bytes32' },
      { name: '_signature', type: 'bytes' },
    ],
    outputs: [{ name: '', type: 'bytes4' }],
  },
] as const;

export type AffiliateTypedData = {
  domain: {
    name: string;
    version: string;
  };
  types: Record<string, AffiliateTypedDataField[]>;
  message: {
    walletAddress: string;
    code: string;
    chainId: number;
  };
};

export type AffiliateTypedDataField = {
  name: string;
  type: string;
};

export enum SignatureCheckResult {
  valid = 'valid',
  invalidAddress = 'invalidAddress',
  invalidSignature = 'invalidSignature',
  addressIsNotSmartContract = 'addressIsNotSmartContract',
}

type Eip1271Client = Pick<PublicClient, 'getBytecode' | 'readContract'>;

/**
 * Verifies affiliate typed-data signatures for both EOAs and contract wallets.
 *
 * Flow:
 * 1) Try standard EIP-712 recovery (`verifyTypedData`) and accept if recovered
 *    signer equals `walletAddress` (EOA path).
 * 2) If recovery mismatches/fails, detect whether `walletAddress` is a contract.
 * 3) For contract wallets, verify via EIP-1271 `isValidSignature(bytes32,bytes)`
 *    against the typed-data digest and accept the EIP-1271 magic value.
 *
 * Return semantics:
 * - `valid`: ownership proof succeeded (EOA or EIP-1271 contract wallet).
 * - `invalidAddress`: signature is valid syntactically but not for `walletAddress`.
 * - `invalidSignature`: malformed signature or verification infrastructure failure.
 * - `addressIsNotSmartContract`: recovery failed and the address has no bytecode.
 */
export async function verifyAffiliateSignature(params: {
  walletAddress: string;
  signedMessage: string;
  typedData: AffiliateTypedData;
  client: Eip1271Client;
}): Promise<SignatureCheckResult> {
  const { walletAddress, signedMessage, typedData } = params;
  const normalizedWalletAddress = walletAddress.toLowerCase();
  const primaryType = 'AffiliateCode';

  let hasRecoverError = false;

  try {
    const isValidEoaSignature = await verifyTypedData({
      address: walletAddress as Address,
      domain: typedData.domain,
      types: typedData.types,
      primaryType,
      message: typedData.message,
      signature: signedMessage as `0x${string}`,
    });

    if (isValidEoaSignature) {
      return SignatureCheckResult.valid;
    }
  } catch (error) {
    hasRecoverError = true;
    logger.warn(
      { error, walletAddress: normalizedWalletAddress },
      'Affiliate typed data recovery failed'
    );
  }

  if (!isHex(signedMessage)) {
    return SignatureCheckResult.invalidSignature;
  }

  try {
    const bytecode = await params.client.getBytecode({
      address: walletAddress as Address,
    });

    if (!bytecode || bytecode === '0x') {
      return hasRecoverError
        ? SignatureCheckResult.addressIsNotSmartContract
        : SignatureCheckResult.invalidAddress;
    }

    const digest = hashTypedData({
      domain: typedData.domain,
      types: typedData.types,
      primaryType,
      message: typedData.message,
    });

    const isValidSignatureResult = await params.client.readContract({
      address: walletAddress as Address,
      abi: EIP1271_ABI,
      functionName: 'isValidSignature',
      args: [digest as `0x${string}`, signedMessage as `0x${string}`],
    });

    if (
      typeof isValidSignatureResult === 'string' &&
      isValidSignatureResult.slice(0, 10).toLowerCase() === EIP1271_MAGIC_VALUE
    ) {
      return SignatureCheckResult.valid;
    }

    return SignatureCheckResult.invalidAddress;
  } catch (error) {
    logger.warn(
      { error, walletAddress: normalizedWalletAddress },
      'Affiliate EIP-1271 verification failed'
    );
    return SignatureCheckResult.invalidSignature;
  }
}
