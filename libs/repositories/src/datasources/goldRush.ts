import { SupportedChainId } from '@cowprotocol/cow-sdk';

export const GOLD_RUSH_API_KEY = process.env.GOLD_RUSH_API_KEY;
export const GOLD_RUSH_API_BASE_URL = 'https://api.covalenthq.com';

/**
 * From https://goldrush.dev/docs/chains/overview
 */
export const GOLD_RUSH_CLIENT_NETWORK_MAPPING = {
  [SupportedChainId.MAINNET]: 'eth-mainnet',
  [SupportedChainId.GNOSIS_CHAIN]: 'gnosis-mainnet',
  [SupportedChainId.ARBITRUM_ONE]: 'arbitrum-mainnet',
  [SupportedChainId.BASE]: 'base-mainnet',
  [SupportedChainId.POLYGON]: 'polygon-mainnet',
  [SupportedChainId.AVALANCHE]: 'avalanche-mainnet',
  [SupportedChainId.SEPOLIA]: 'eth-sepolia',
  [SupportedChainId.LENS]: 'lens-mainnet',
  [SupportedChainId.BNB]: 'bsc-mainnet',
  [SupportedChainId.LINEA]: 'linea-mainnet',
  [SupportedChainId.PLASMA]: 'plasma-mainnet',
  [SupportedChainId.INK]: 'ink-mainnet',
} as const satisfies Record<SupportedChainId, string>;
