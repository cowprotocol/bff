import { SupportedChainId } from '@cowprotocol/cow-sdk';

export const ANKR_API_KEY = process.env.ANKR_API_KEY;
export const ANKR_API_BASE_URL = 'https://rpc.ankr.com/multichain';

/**
 * Ankr blockchain names
 * From https://www.ankr.com/docs/advanced-api/overview/
 */
export const ANKR_CLIENT_NETWORK_MAPPING: Record<
  SupportedChainId,
  string | null
> = {
  [SupportedChainId.MAINNET]: 'eth',
  [SupportedChainId.SEPOLIA]: 'eth_sepolia',
  [SupportedChainId.GNOSIS_CHAIN]: 'gnosis',
  [SupportedChainId.ARBITRUM_ONE]: 'arbitrum',
  [SupportedChainId.POLYGON]: 'polygon',
  [SupportedChainId.AVALANCHE]: 'avalanche',
  [SupportedChainId.BASE]: 'base',
  [SupportedChainId.LENS]: null,
  [SupportedChainId.BNB]: 'bsc',
  [SupportedChainId.LINEA]: 'linea',
  [SupportedChainId.PLASMA]: null,
};

export function getAnkrApiUrl(apiKey?: string): string {
  if (apiKey) {
    return `${ANKR_API_BASE_URL}/${apiKey}`;
  }
  return ANKR_API_BASE_URL;
}

