import { SupportedChainId } from '@cowprotocol/shared';

export const GOLD_RUSH_API_KEY = process.env.GOLD_RUSH_API_KEY;
export const GOLD_RUSH_API_BASE_URL = 'https://api.covalenthq.com';

export const GOLD_RUSH_CLIENT_NETWORK_MAPPING: Record<
  SupportedChainId,
  string
> = {
  [SupportedChainId.MAINNET]: 'eth-mainnet',
  [SupportedChainId.SEPOLIA]: 'eth-sepolia',
  [SupportedChainId.GNOSIS_CHAIN]: 'gnosis-mainnet',
  [SupportedChainId.ARBITRUM_ONE]: 'arbitrum-mainnet',
};
