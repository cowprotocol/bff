import { SupportedChainId } from '@cowprotocol/cow-sdk';

export const MORALIS_API_KEY = process.env.MORALIS_API_KEY;
export const MORALIS_API_BASE_URL = 'https://deep-index.moralis.io/api';

export const MORALIS_CLIENT_NETWORK_MAPPING: Record<SupportedChainId, string> =
  {
    [SupportedChainId.MAINNET]: 'eth',
    [SupportedChainId.SEPOLIA]: 'sepolia',
    [SupportedChainId.GNOSIS_CHAIN]: 'gnosis',
    [SupportedChainId.ARBITRUM_ONE]: 'arbitrum',
    [SupportedChainId.POLYGON]: 'polygon',
    [SupportedChainId.AVALANCHE]: 'avalanche',
    [SupportedChainId.BASE]: 'base',
  };
