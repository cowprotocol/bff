import {
  COINGECKO_PLATFORMS,
  SUPPORTED_COINGECKO_PLATFORMS,
} from '../datasources/coingecko';
import {
  AdditionalTargetChainId,
  BTC_CURRENCY_ADDRESS,
  EVM_NATIVE_CURRENCY_ADDRESS,
  getAddressKey,
  SOL_NATIVE_CURRENCY_ADDRESS,
  SupportedChainId,
  TargetChainId,
} from '@cowprotocol/cow-sdk';

const NATIVE_CURRENCY_ADDRESSES = new Set([
  getAddressKey(EVM_NATIVE_CURRENCY_ADDRESS),
  getAddressKey(SOL_NATIVE_CURRENCY_ADDRESS),
  getAddressKey(BTC_CURRENCY_ADDRESS),
]);

// Invert number→slug map to slug→SupportedChainId
const SUPPORTED_CHAIN_SLUG_TO_ID: Record<string, TargetChainId> =
  Object.entries(SUPPORTED_COINGECKO_PLATFORMS).reduce((map, [id, slug]) => {
    if (slug) {
      map[slug as string] = +id as TargetChainId;
    }
    return map;
  }, {} as Record<string, TargetChainId>);

export function getAddressOrPlatform(
  tokenAddress: string | undefined,
  platform: string
): string {
  if (!tokenAddress) {
    return platform;
  }

  // Native currency addresses are conventions, not real contracts.
  // CoinGecko expects platform-level lookup for native tokens.
  const addressKey = getAddressKey(tokenAddress);

  if (NATIVE_CURRENCY_ADDRESSES.has(addressKey)) {
    return platform;
  }

  // getAddressKey lowercases EVM addresses (as CoinGecko expects)
  // and preserves case for non-EVM addresses
  return addressKey;
}

export function getCoingeckoPlatform(
  chainIdOrSlug: string
): string | undefined {
  // If the chainIdOrSlug is a number, it is a chainId and should match an existing platform on Coingecko
  return COINGECKO_PLATFORMS[+chainIdOrSlug] || chainIdOrSlug;
}

export function getSupportedCoingeckoChainId(
  chainIdOrSlug: string
): TargetChainId | null {
  const chainIdAsNumber = +chainIdOrSlug;
  // Only SupportedChainIds are supported
  const numericId = isNaN(chainIdAsNumber)
    ? SUPPORTED_CHAIN_SLUG_TO_ID[chainIdOrSlug]
    : (chainIdAsNumber as TargetChainId);

  return SupportedChainId[numericId] || AdditionalTargetChainId[numericId]
    ? numericId
    : null;
}
