import { SupportedChainId } from '@cowprotocol/shared';
import BigNumber from 'bignumber.js';

interface TokenAddressAndDecimals {
  address: string;
  decimals: number;
}

export const USDC: Record<SupportedChainId, TokenAddressAndDecimals> = {
  [SupportedChainId.MAINNET]: {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    decimals: 6,
  },
  [SupportedChainId.GNOSIS_CHAIN]: {
    address: '0x2a22f9c3b484c3629090feed35f17ff8f88f76f0',
    decimals: 6,
  },
  [SupportedChainId.ARBITRUM_ONE]: {
    address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    decimals: 6,
  },
  [SupportedChainId.BASE]: {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    decimals: 6,
  },
  [SupportedChainId.SEPOLIA]: {
    address: '0xbe72E441BF55620febc26715db68d3494213D8Cb',
    decimals: 18,
  },
};

export const ZeroBigNumber = new BigNumber(0);
export const OneBigNumber = new BigNumber(1);
export const TenBigNumber = new BigNumber(10);
