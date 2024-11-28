import { SupportedChainId } from '@cowprotocol/cow-sdk';

const COW_API_BASE_URL = 'https://api.cow.fi';

const CHAIN_ID_TO_NAME: Record<SupportedChainId, string> = {
  [SupportedChainId.MAINNET]: 'mainnet',
  [SupportedChainId.GNOSIS_CHAIN]: 'xdai',
  [SupportedChainId.SEPOLIA]: 'sepolia',
  [SupportedChainId.ARBITRUM_ONE]: 'arbitrum-one',
  [SupportedChainId.BASE]: 'base',
};

export function getApiBaseUrl(chainId: SupportedChainId): string {
  const chainName = CHAIN_ID_TO_NAME[chainId];

  return `${COW_API_BASE_URL}/${chainName}/v1`;
}
