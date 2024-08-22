import createClient from 'openapi-fetch';

const COW_API_BASE_URL = process.env.COW_API_BASE_URL || 'https://api.cow.fi';

import type { paths } from '../gen/cow/cow-api-types';
import { AllChainIds, SupportedChainId } from '@cowprotocol/shared';

export type CowApiClient = ReturnType<typeof createClient<paths>>;

const COW_API_NETWORK_NAMES: Record<SupportedChainId, string> = {
  [SupportedChainId.MAINNET]: 'mainnet',
  [SupportedChainId.GNOSIS_CHAIN]: 'xdai',
  [SupportedChainId.ARBITRUM_ONE]: 'arbitrum_one',
  [SupportedChainId.SEPOLIA]: 'sepolia',
};

export const cowApiClients = AllChainIds.reduce<
  Record<SupportedChainId, CowApiClient>
>((acc, chainId) => {
  const cowApiUrl =
    process.env[`COW_API_URL_${chainId}`] ||
    COW_API_BASE_URL + '/' + COW_API_NETWORK_NAMES[chainId];

  acc[chainId] = createClient<paths>({
    baseUrl: cowApiUrl,
  });

  return acc;
}, {} as Record<SupportedChainId, CowApiClient>);
