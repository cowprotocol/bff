import { SupportedChainId } from '@cowprotocol/cow-sdk';
import { TokenFromAPI } from './types';

export function tokenListSearch(
  TOKEN_MAP: Record<string, TokenFromAPI[]>,
  chainId: SupportedChainId,
  searchParam: string
) {
  const trimmedSearchParam = searchParam.trim().toLowerCase();

  return TOKEN_MAP[chainId].filter(
    (token) =>
      token.name.toLowerCase().includes(trimmedSearchParam) ||
      token.symbol.toLowerCase().includes(trimmedSearchParam) ||
      token.address.toLowerCase().includes(trimmedSearchParam)
  );
}
