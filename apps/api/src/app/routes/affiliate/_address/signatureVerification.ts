import { ethers, type TypedDataField } from 'ethers';
import { Address, PublicClient } from 'viem';

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
  types: Record<string, TypedDataField[]>;
  message: {
    walletAddress: string;
    code: string;
    chainId: number;
  };
};

export type AffiliateSignatureVerificationResult =
  | 'valid'
  | 'invalidAddress'
  | 'invalidSignature';

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
 */
export async function verifyAffiliateSignature(params: {
  walletAddress: string;
  signedMessage: string;
  typedData: AffiliateTypedData;
  client: Eip1271Client;
}): Promise<AffiliateSignatureVerificationResult> {
  const { walletAddress, signedMessage, typedData } = params;
  const normalizedWalletAddress = walletAddress.toLowerCase();

  let hasRecoverError = false;

  try {
    const recoveredAddress = ethers.utils.verifyTypedData(
      typedData.domain,
      typedData.types,
      typedData.message,
      signedMessage
    );

    if (recoveredAddress.toLowerCase() === normalizedWalletAddress) {
      return 'valid';
    }
  } catch {
    hasRecoverError = true;
  }

  if (!ethers.utils.isHexString(signedMessage)) {
    return 'invalidSignature';
  }

  try {
    const bytecode = await params.client.getBytecode({
      address: walletAddress as Address,
    });

    if (!bytecode || bytecode === '0x') {
      return hasRecoverError ? 'invalidSignature' : 'invalidAddress';
    }

    const digest = ethers.utils._TypedDataEncoder.hash(
      typedData.domain,
      typedData.types,
      typedData.message
    );

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
      return 'valid';
    }

    return 'invalidAddress';
  } catch {
    return 'invalidSignature';
  }
}
