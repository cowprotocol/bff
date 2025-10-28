import { SupportedChainId } from '@cowprotocol/cow-sdk';
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
  [SupportedChainId.POLYGON]: {
    // https://polygonscan.com/address/0x3c499c542cef5e3811e1192ce70d8cc03d5c3359
    address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    decimals: 6,
  },
  [SupportedChainId.AVALANCHE]: {
    // https://snowscan.xyz/token/0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e
    address: '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
    decimals: 6,
  },
  // https://explorer.lens.xyz/address/0x88f08e304ec4f90d644cec3fb69b8ad414acf884
  [SupportedChainId.LENS]: {
    address: '0x88f08e304ec4f90d644cec3fb69b8ad414acf884',
    decimals: 6,
  },
  // https://bscscan.com/token/0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d
  [SupportedChainId.BNB]: {
    address: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
    decimals: 18, // YES, it's 18 decimals on BNB
  },
  [SupportedChainId.LINEA]: {
    address: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff',
    decimals: 6,
  },
  [SupportedChainId.PLASMA]: {
    address: '0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb', // Plasma is the USDT chain, using USDT instead of USDC
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
