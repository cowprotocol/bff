import { COW_API_NETWORK_NAMES, EvmChainId } from '@cowprotocol/shared'

const COW_API_BASE_URL = 'https://api.cow.fi'

export function getApiBaseUrl(chainId: EvmChainId): string {
  const chainName = COW_API_NETWORK_NAMES[chainId]

  return `${COW_API_BASE_URL}/${chainName}/v1`
}
