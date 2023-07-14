import { SupportedChainId } from '@cowprotocol/cow-sdk';

const COW_API_BASE_URL = 'https://api.cow.fi';

const CHAIN_ID_TO_NAME: Record<SupportedChainId, string> = {
  1: 'mainnet',
  5: 'goerli',
  100: 'xdai',
};

export function getApiBaseUrl(chainId: SupportedChainId): string {
  const chainName = CHAIN_ID_TO_NAME[chainId];

  return `${COW_API_BASE_URL}/${chainName}/api/v1`;
}
