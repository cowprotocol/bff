import createClient from 'openapi-fetch'

const COW_API_BASE_URL = process.env.COW_API_BASE_URL || 'https://api.cow.fi'

import { COW_API_NETWORK_NAMES, EVM_CHAIN_IDS, EvmChainId } from '@cowprotocol/shared'
import type { paths } from '../gen/cow/cow-api-types'

export type CowApiClient = ReturnType<typeof createClient<paths>>

// CoW API only exists for EVM chains with CoW Protocol settlement, so Solana is excluded here.
export const cowApiClients = EVM_CHAIN_IDS.reduce<Record<EvmChainId, CowApiClient>>((acc, chainId) => {
  const cowApiUrl = process.env[`COW_API_URL_${chainId}`] || COW_API_BASE_URL + '/' + COW_API_NETWORK_NAMES[chainId]

  acc[chainId] = createClient<paths>({
    baseUrl: cowApiUrl,
  })

  return acc
}, {} as Record<EvmChainId, CowApiClient>)
