import createClient from 'openapi-fetch';

const COW_API_BASE_URL = process.env.COW_API_BASE_URL || 'https://api.cow.fi';

import type { paths } from '../gen/cow/cow-api-types';
import { ALL_CHAIN_IDS, SupportedChainId } from '../types';

export type CowApiClient = ReturnType<typeof createClient<paths>>;

const COW_API_NETWORK_NAMES: Record<SupportedChainId, string> = {
  [SupportedChainId.MAINNET]: 'mainnet',
  [SupportedChainId.GNOSIS_CHAIN]: 'xdai',
  [SupportedChainId.ARBITRUM_ONE]: 'arbitrum_one',
  [SupportedChainId.SEPOLIA]: 'sepolia',
};

export const cowApiClients = ALL_CHAIN_IDS.reduce<
  Record<SupportedChainId, CowApiClient>
>((acc, chainId) => {
  acc[chainId] = createClient<paths>({
    baseUrl: COW_API_BASE_URL + '/' + COW_API_NETWORK_NAMES[chainId],
  });

  return acc;
}, {} as Record<SupportedChainId, CowApiClient>);
