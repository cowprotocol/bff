import { Wallet } from 'ethers';

import {
  AffiliateSignatureVerificationResult,
  AffiliateTypedData,
  verifyAffiliateSignature,
} from './signatureVerification';

function buildTypedData(walletAddress: string): AffiliateTypedData {
  return {
    domain: {
      name: 'CoW Swap Affiliate',
      version: '1',
    },
    types: {
      AffiliateCode: [
        { name: 'walletAddress', type: 'address' },
        { name: 'code', type: 'string' },
        { name: 'chainId', type: 'uint256' },
      ],
    },
    message: {
      walletAddress,
      code: 'COW-12345',
      chainId: 1,
    },
  };
}

describe('verifyAffiliateSignature', () => {
  it('returns valid for a matching EOA signature', async () => {
    const wallet = Wallet.createRandom();
    const typedData = buildTypedData(wallet.address);
    const signedMessage = await wallet._signTypedData(
      typedData.domain,
      typedData.types,
      typedData.message
    );
    const client = {
      getBytecode: jest.fn(),
      readContract: jest.fn(),
    };

    const result = await verifyAffiliateSignature({
      walletAddress: wallet.address,
      signedMessage,
      typedData,
      client,
    });

    expect(result).toBe(AffiliateSignatureVerificationResult.valid);
    expect(client.getBytecode).not.toHaveBeenCalled();
  });

  it('returns invalidAddress for mismatched EOA signer', async () => {
    const signer = Wallet.createRandom();
    const walletAddress = Wallet.createRandom().address;
    const typedData = buildTypedData(walletAddress);
    const signedMessage = await signer._signTypedData(
      typedData.domain,
      typedData.types,
      typedData.message
    );
    const client = {
      getBytecode: jest.fn().mockResolvedValue(null),
      readContract: jest.fn(),
    };

    const result = await verifyAffiliateSignature({
      walletAddress,
      signedMessage,
      typedData,
      client,
    });

    expect(result).toBe(AffiliateSignatureVerificationResult.invalidAddress);
    expect(client.readContract).not.toHaveBeenCalled();
  });

  it('returns valid for contract wallets via EIP-1271', async () => {
    const signer = Wallet.createRandom();
    const walletAddress = Wallet.createRandom().address;
    const typedData = buildTypedData(walletAddress);
    const signedMessage = await signer._signTypedData(
      typedData.domain,
      typedData.types,
      typedData.message
    );
    const client = {
      getBytecode: jest.fn().mockResolvedValue('0x1234'),
      readContract: jest.fn().mockResolvedValue('0x1626ba7e00000000000000000000000000000000000000000000000000000000'),
    };

    const result = await verifyAffiliateSignature({
      walletAddress,
      signedMessage,
      typedData,
      client,
    });

    expect(result).toBe(AffiliateSignatureVerificationResult.valid);
    expect(client.readContract).toHaveBeenCalledTimes(1);
  });

  it('returns invalidAddress when EIP-1271 magic value is not returned', async () => {
    const signer = Wallet.createRandom();
    const walletAddress = Wallet.createRandom().address;
    const typedData = buildTypedData(walletAddress);
    const signedMessage = await signer._signTypedData(
      typedData.domain,
      typedData.types,
      typedData.message
    );
    const client = {
      getBytecode: jest.fn().mockResolvedValue('0x1234'),
      readContract: jest.fn().mockResolvedValue('0xffffffff'),
    };

    const result = await verifyAffiliateSignature({
      walletAddress,
      signedMessage,
      typedData,
      client,
    });

    expect(result).toBe(AffiliateSignatureVerificationResult.invalidAddress);
  });

  it('returns invalidSignature for malformed signatures', async () => {
    const walletAddress = Wallet.createRandom().address;
    const typedData = buildTypedData(walletAddress);
    const client = {
      getBytecode: jest.fn().mockResolvedValue('0x1234'),
      readContract: jest.fn(),
    };

    const result = await verifyAffiliateSignature({
      walletAddress,
      signedMessage: 'not-a-hex-signature',
      typedData,
      client,
    });

    expect(result).toBe(AffiliateSignatureVerificationResult.invalidSignature);
    expect(client.getBytecode).not.toHaveBeenCalled();
  });

  it('returns invalidSignature when EIP-1271 contract call fails', async () => {
    const signer = Wallet.createRandom();
    const walletAddress = Wallet.createRandom().address;
    const typedData = buildTypedData(walletAddress);
    const signedMessage = await signer._signTypedData(
      typedData.domain,
      typedData.types,
      typedData.message
    );
    const client = {
      getBytecode: jest.fn().mockResolvedValue('0x1234'),
      readContract: jest.fn().mockRejectedValue(new Error('rpc failed')),
    };

    const result = await verifyAffiliateSignature({
      walletAddress,
      signedMessage,
      typedData,
      client,
    });

    expect(result).toBe(AffiliateSignatureVerificationResult.invalidSignature);
  });

  it('returns addressIsNotSmartContract when recovery fails for an EOA address', async () => {
    const walletAddress = Wallet.createRandom().address;
    const typedData = buildTypedData(walletAddress);
    const client = {
      getBytecode: jest.fn().mockResolvedValue('0x'),
      readContract: jest.fn(),
    };

    const result = await verifyAffiliateSignature({
      walletAddress,
      signedMessage:
        '0x11111111111111111111111111111111111111111111111111111111111111111b',
      typedData,
      client,
    });

    expect(result).toBe(
      AffiliateSignatureVerificationResult.addressIsNotSmartContract
    );
    expect(client.readContract).not.toHaveBeenCalled();
  });
});
