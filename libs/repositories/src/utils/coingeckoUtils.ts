import { COINGECKO_PLATFORMS, KNOWN_COINGECKO_PLATFORMS, NATIVE_COIN_ID_BY_PLATFORM } from '../datasources/coingecko'
import {
  AdditionalTargetChainId,
  BTC_CURRENCY_ADDRESS,
  EVM_NATIVE_CURRENCY_ADDRESS,
  getAddressKey,
  SOL_NATIVE_CURRENCY_ADDRESS,
  SupportedChainId,
  TargetChainId,
} from '@cowprotocol/cow-sdk'

// For EVM/Solana/Bitcoin we use internal native-currency placeholders.
// for coingecko we should just replace the address by platform
const NATIVE_TOKEN_PLACEHOLDERS = new Set([
  getAddressKey(EVM_NATIVE_CURRENCY_ADDRESS),
  getAddressKey(SOL_NATIVE_CURRENCY_ADDRESS),
  getAddressKey(BTC_CURRENCY_ADDRESS),
])

// Invert chainId→platform to platform→chainId. Covers every platform CoinGecko publishes a chain id
// for; getSupportedCoingeckoChainId narrows that back down to the chains this repo supports.
const CHAIN_SLUG_TO_ID: Record<string, TargetChainId> = Object.entries(COINGECKO_PLATFORMS).reduce(
  (map, [id, slug]) => {
    if (slug) {
      map[slug] = +id as TargetChainId
    }
    return map
  },
  {} as Record<string, TargetChainId>
)

export function getAddressOrPlatform(tokenAddress: string | undefined, platform: string): string {
  if (!tokenAddress) {
    return platform
  }

  // Native currency addresses are conventions, not real contracts.
  // CoinGecko expects platform-level lookup for native tokens.
  const addressKey = getAddressKey(tokenAddress)

  if (NATIVE_TOKEN_PLACEHOLDERS.has(addressKey)) {
    return platform
  }

  // getAddressKey lowercases EVM addresses (as CoinGecko expects)
  // and preserves case for non-EVM addresses
  return addressKey
}

export function getCoingeckoPlatform(chainIdOrSlug: string): string | undefined {
  const chainId = +chainIdOrSlug

  // A chain id only resolves if we have a platform for it. Falling through to the raw id would send
  // e.g. '232' to Coingecko as a platform, which is a guaranteed 404.
  if (!isNaN(chainId)) {
    return COINGECKO_PLATFORMS[chainId]
  }

  // A slug only resolves if Coingecko actually publishes it as a platform. Anything else (a CoW-side
  // slug like 'mainnet', or junk from a scanner) would 404 upstream, so don't spend the call.
  return KNOWN_COINGECKO_PLATFORMS.has(chainIdOrSlug) ? chainIdOrSlug : undefined
}

/**
 * Coingecko coin id for a platform's native currency.
 *
 * Platform ids are not coin ids. '/simple/price?ids=base' resolves to an unrelated token called
 * 'Base' rather than the ETH that Base settles in, so native lookups must go through this.
 */
export function getNativeCoinId(platform: string): string | undefined {
  return NATIVE_COIN_ID_BY_PLATFORM[platform]
}

export function getSupportedCoingeckoChainId(chainIdOrSlug: string): TargetChainId | null {
  const chainIdAsNumber = +chainIdOrSlug
  // Only SupportedChainIds are supported
  const numericId = isNaN(chainIdAsNumber) ? CHAIN_SLUG_TO_ID[chainIdOrSlug] : (chainIdAsNumber as TargetChainId)

  return SupportedChainId[numericId] || AdditionalTargetChainId[numericId] ? numericId : null
}
