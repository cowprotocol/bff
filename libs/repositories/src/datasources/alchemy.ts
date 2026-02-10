import { SupportedChainId } from '@cowprotocol/cow-sdk';

export const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;

/**
 * Alchemy API base URL format: https://{network}.g.alchemy.com/v2/{apiKey}
 * From https://www.alchemy.com/docs/data/token-api/token-api-endpoints/alchemy-get-token-balances
 */
export const ALCHEMY_CLIENT_NETWORK_MAPPING: Record<
  SupportedChainId,
  string | null
> = {
  [SupportedChainId.MAINNET]: 'eth-mainnet',
  [SupportedChainId.SEPOLIA]: null, // it's actually supported, but we don't use it for bff 
  [SupportedChainId.GNOSIS_CHAIN]: 'gnosis-mainnet',
  [SupportedChainId.ARBITRUM_ONE]: 'arb-mainnet',
  [SupportedChainId.POLYGON]: 'polygon-mainnet',
  [SupportedChainId.AVALANCHE]: 'avax-mainnet',
  [SupportedChainId.BASE]: 'base-mainnet',
  [SupportedChainId.LENS]: 'lens-mainnet',
  [SupportedChainId.BNB]: 'bnb-mainnet',
  [SupportedChainId.LINEA]: 'linea-mainnet',
  [SupportedChainId.INK]: 'ink-mainnet',
  [SupportedChainId.PLASMA]: null, // todo add when alchemy supports plasma
};

export function getAlchemyApiUrl(network: string, apiKey: string): string {
  return `https://${network}.g.alchemy.com/v2/${apiKey}`;
}
