import { SupportedChainId } from '@cowprotocol/shared';

import createClient from 'openapi-fetch';

import type { paths, components } from '../gen/coingecko/coingecko-pro-types';

export const COINGECKO_PRO_BASE_URL = 'https://pro-api.coingecko.com';

export const COINGECKO_PLATFORMS: Record<SupportedChainId, string | undefined> =
  {
    [SupportedChainId.MAINNET]: 'ethereum',
    [SupportedChainId.GNOSIS_CHAIN]: 'xdai',
    [SupportedChainId.ARBITRUM_ONE]: 'arbitrum-one',
    [SupportedChainId.SEPOLIA]: undefined,
  };

export const coingeckoProClient = createClient<paths>({
  baseUrl: COINGECKO_PRO_BASE_URL + '/api/v3',
  headers: {
    'x-cg-pro-api-key': process.env.COINGECKO_API_KEY,
  },
});

export type SimplePriceItem = components['schemas']['SimplePrice'];
export type SimplePriceResponse = Record<string, SimplePriceItem>;
