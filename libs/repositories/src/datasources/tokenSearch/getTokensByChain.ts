import { SupportedChainId } from '@cowprotocol/cow-sdk';
import { TokenFromAPI } from './types';

async function fetchTokensFromCoinGecko(
  chainName: string,
  chainId: SupportedChainId
): Promise<TokenFromAPI[]> {
  const tokenSource = `https://tokens.coingecko.com/${chainName}/all.json`;

  console.log(`Fetching tokens for ${chainName}`);

  const response = await fetch(tokenSource);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch tokens from ${tokenSource}: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  if (!data.tokens || !Array.isArray(data.tokens)) {
    throw new Error(
      `Invalid token list format from ${tokenSource}: missing or invalid tokens array`
    );
  }

  console.log(`Fetched ${data.tokens.length} tokens for ${chainName}`);

  return data.tokens.map((token: TokenFromAPI) => ({
    ...token,
    chainId,
  }));
}

export async function getTokensByChainName(
  chainName: string,
  chainId: SupportedChainId
): Promise<TokenFromAPI[]> {
  return fetchTokensFromCoinGecko(chainName, chainId);
}
