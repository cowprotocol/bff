import { SupportedChainId } from './types';

import createClient from 'openapi-fetch';

import type { paths } from './gen/coingecko/coingecko-pro-types';

export const COINGECKO_PLATFORMS: Record<SupportedChainId, string | undefined> =
  {
    [SupportedChainId.MAINNET]: 'ethereum',
    [SupportedChainId.GNOSIS_CHAIN]: 'xdai',
    [SupportedChainId.ARBITRUM_ONE]: 'arbitrum-one',
    [SupportedChainId.SEPOLIA]: undefined,
  };

export const coingeckoProClient = createClient<paths>({
  baseUrl: process.env.COINGECKO_PROXY_UPSTREAM + '/api/v3',
  headers: {
    'x-cg-pro-api-key': process.env.COINGECKO_API_KEY,
  },
});
