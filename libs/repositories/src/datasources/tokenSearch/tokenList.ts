import { SupportedChainId } from '@cowprotocol/cow-sdk';
import { TokenCacheRepository } from '../../repos/TokenCacheRepository';
import { SUPPORTED_COINGECKO_PLATFORMS } from '../coingecko';
import { getTokensByChainName } from './getTokensByChain';
import { TokenFromAPI } from './types';

let tokenCacheRepository: TokenCacheRepository | null = null;

export function setTokenCacheRepository(
  repository: TokenCacheRepository
): void {
  tokenCacheRepository = repository;
}

export async function initTokenList(
  chainId: SupportedChainId,
  cacheRepository?: TokenCacheRepository
): Promise<void> {
  const repository = cacheRepository || tokenCacheRepository;

  if (!repository) {
    throw new Error(
      'TokenCacheRepository not configured. Please set it using setTokenCacheRepository()'
    );
  }

  const chainName = SUPPORTED_COINGECKO_PLATFORMS[chainId];

  if (!chainName) {
    throw new Error(`Chain ${chainId} is not supported by CoinGecko`);
  }

  // Check if tokens are already cached
  const hasTokens = await repository.hasTokenList(chainId);
  if (hasTokens) {
    console.log(`Token list already cached for chain ${chainId}`);
    return;
  }

  console.log(`Initializing token list for chain ${chainId}`);
  const tokens = await getTokensByChainName(chainName, chainId);

  await repository.initTokenList(chainId, tokens);
  console.log(`Cached ${tokens.length} tokens for chain ${chainId}`);
}

export async function getTokenListBySearchParam(
  chainId: SupportedChainId,
  searchParam: string,
  cacheRepository?: TokenCacheRepository
): Promise<TokenFromAPI[]> {
  const repository = cacheRepository || tokenCacheRepository;

  if (!repository) {
    throw new Error(
      'TokenCacheRepository not configured. Please set it using setTokenCacheRepository()'
    );
  }

  return repository.searchTokens(chainId, searchParam);
}
