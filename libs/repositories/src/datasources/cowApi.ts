import createClient from 'openapi-fetch';

const COW_API_BASE_URL = process.env.COW_API_BASE_URL || 'https://api.cow.fi';

import {
  AllChainIds,
  COW_API_NETWORK_NAMES,
  SupportedChainId,
} from '@cowprotocol/shared';
import type { paths } from '../gen/cow/cow-api-types';

export type CowApiClient = ReturnType<typeof createClient<paths>>;

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
