import { SupportedChainId } from '@cowprotocol/cow-sdk';
import { tokenListSearch } from './tokenListSearch';
import { TokenFromAPI } from './types';
import { SUPPORTED_COINGECKO_PLATFORMS } from '../coingecko';
import { getTokensByChainName } from './getTokensByChain';

const TOKEN_MAP: Record<string, TokenFromAPI[]> = {};

export async function initTokenList(chainId: SupportedChainId) {
  const chainName = SUPPORTED_COINGECKO_PLATFORMS[chainId];

  if (!chainName) {
    throw new Error(`Chain ${chainId} is not supported by CoinGecko`);
  }

  TOKEN_MAP[chainId] = [];

  const tokens = await getTokensByChainName(chainName);

  tokens.forEach((token: TokenFromAPI) => {
    TOKEN_MAP[chainId].push(token);
  });
}

export function getTokenListBySearchParam(
  chainId: SupportedChainId,
  searchParam: string
): TokenFromAPI[] {
  return tokenListSearch(TOKEN_MAP, chainId, searchParam);
}
