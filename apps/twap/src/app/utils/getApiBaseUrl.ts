import { SupportedChainId } from '@cowprotocol/cow-sdk';

const COW_API_BASE_URL = 'https://api.cow.fi';

const CHAIN_ID_TO_NAME: Record<SupportedChainId, string> = {
  1: 'mainnet',
  100: 'xdai',
  '11155111': 'sepolia',
};

export function getApiBaseUrl(chainId: SupportedChainId): string {
  const chainName = CHAIN_ID_TO_NAME[chainId];

  return `${COW_API_BASE_URL}/${chainName}/v1`;
}
