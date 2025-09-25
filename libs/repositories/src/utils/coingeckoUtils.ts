import { isAddress } from 'viem';
import {
  COINGECKO_PLATFORMS,
  SUPPORTED_COINGECKO_PLATFORMS,
} from '../datasources/coingecko';
import { SupportedChainId } from '@cowprotocol/cow-sdk';

// Invert number→slug map to slug→SupportedChainId
const SUPPORTED_CHAIN_SLUG_TO_ID: Record<string, SupportedChainId> =
  Object.entries(SUPPORTED_COINGECKO_PLATFORMS).reduce((map, [id, slug]) => {
    if (slug) {
      map[slug as string] = +id as SupportedChainId;
    }
    return map;
  }, {} as Record<string, SupportedChainId>);

export function getAddressOrPlatform(
  tokenAddress: string | undefined,
  platform: string
): string {
  if (!tokenAddress) {
    return platform;
  }

  if (isAddress(tokenAddress)) {
    // EVM like address, Coingecko expects it lowercased
    return tokenAddress.toLowerCase();
  }

  // Non-EVM address, Coingecko expects it as is
  return tokenAddress;
}

export function getCoingeckoPlatform(
  chainIdOrSlug: string
): string | undefined {
  // If the chainIdOrSlug is a number, it is a chainId and should match an existing platform on Coingecko
  return COINGECKO_PLATFORMS[+chainIdOrSlug] || chainIdOrSlug;
}

export function getSupportedCoingeckoChainId(
  chainIdOrSlug: string
): SupportedChainId | null {
  const chainIdAsNumber = +chainIdOrSlug;
  // Only SupportedChainIds are supported
  const numericId = isNaN(chainIdAsNumber)
    ? SUPPORTED_CHAIN_SLUG_TO_ID[chainIdOrSlug]
    : (chainIdAsNumber as SupportedChainId);

  return SupportedChainId[numericId] ? numericId : null;
}
