import { AdditionalTargetChainId, SupportedChainId, TargetChainId } from '@cowprotocol/cow-sdk'

import createClient from 'openapi-fetch'
import { fetchWithTimeout } from '../utils/fetchWithTimeout'
import { upstreamLogging } from '../utils/upstreamLogging'
import type { components, paths } from '../gen/coingecko/coingecko-pro-types'
import { COINGECKO_ASSET_PLATFORMS } from '../gen/coingecko/asset-platforms'

export const COINGECKO_PRO_BASE_URL = 'https://pro-api.coingecko.com'

/**
 * The only chains CoinGecko's asset platform feed can't map on its own. Every other chain, including
 * all the EVM ones CoW settles on, is derived from the feed rather than repeated here.
 *
 * Completeness is enforced by a test asserting every AllChainIds entry resolves, which also catches
 * a platform ID that no longer exists upstream — something a hand-written table could not.
 */
export const COINGECKO_PLATFORM_OVERRIDES = {
  // CoinGecko has no Sepolia platform at all, so there are no USD prices for it
  [SupportedChainId.SEPOLIA]: undefined,
  // Bitcoin hosts no tokens, so CoinGecko publishes no asset platform for it. We address it by coin ID.
  [AdditionalTargetChainId.BITCOIN]: 'bitcoin',
  // The solana platform exists upstream but carries no chain_identifier, as it isn't an EVM chain
  [SupportedChainId.SOLANA]: 'solana',
} as const satisfies Partial<Record<TargetChainId, string | undefined>>

/**
 * Map of chain IDs to CoinGecko platform IDs, for every platform that has a network id.
 * The platform ID is used to identify the blockchain on CoinGecko.
 *
 * Built from the generated asset platform list, with the handful of overrides CoinGecko's feed
 * can't express layered on top.
 */
export const COINGECKO_PLATFORMS: Record<number, string | undefined> = {
  ...COINGECKO_ASSET_PLATFORMS.reduce<Record<number, string | undefined>>((acc, { platform, chainId }) => {
    if (chainId !== null) {
      acc[chainId] = platform
    }
    return acc
  }, {}),
  ...COINGECKO_PLATFORM_OVERRIDES,
}

/**
 * CoinGecko coin ID of each platform's native currency, keyed by platform ID.
 *
 * A platform ID is NOT a coin ID: `/simple/price?ids=base` resolves to an unrelated token called
 * "Base", not to the ETH that Base actually settles in. Native prices must be looked up by coin ID.
 */
export const NATIVE_COIN_ID_BY_PLATFORM: Record<string, string | undefined> = {
  ...COINGECKO_ASSET_PLATFORMS.reduce<Record<string, string | undefined>>((acc, { platform, nativeCoinId }) => {
    acc[platform] = nativeCoinId ?? undefined
    return acc
  }, {}),
  // CoinGecko lists no "bitcoin" asset platform, since Bitcoin hosts no tokens. We use the coin ID
  // as the platform for it in COINGECKO_PLATFORM_OVERRIDES, so map it back to itself here.
  bitcoin: 'bitcoin',
}

/** Every platform ID CoinGecko knows about, used to reject unknown chain slugs before calling it. */
export const KNOWN_COINGECKO_PLATFORMS: ReadonlySet<string> = new Set([
  ...COINGECKO_ASSET_PLATFORMS.map(({ platform }) => platform),
  // Chains we address by coin ID because CoinGecko publishes no asset platform for them (e.g. bitcoin)
  ...Object.values(COINGECKO_PLATFORM_OVERRIDES).flatMap((platform) => (platform ? [platform] : [])),
])

export type CoingeckoProClient = ReturnType<typeof createClient<paths>>

const coingeckoProClientCache: Record<string, CoingeckoProClient | undefined> = {}

export function getCoingeckoProClient(apiKey = process.env.COINGECKO_API_KEY): CoingeckoProClient {
  if (!apiKey) {
    throw new Error('COINGECKO_API_KEY is not set')
  }

  const cached = coingeckoProClientCache[apiKey]

  if (cached) return cached

  const coingeckoProClient = createClient<paths>({
    baseUrl: COINGECKO_PRO_BASE_URL + '/api/v3',
    headers: {
      'x-cg-pro-api-key': apiKey,
    },
    fetch: fetchWithTimeout(),
  })

  coingeckoProClient.use(upstreamLogging('coingecko'))

  coingeckoProClientCache[apiKey] = coingeckoProClient

  return coingeckoProClient
}

export type SimplePriceItem = components['schemas']['SimplePrice']
export type SimplePriceResponse = Record<string, SimplePriceItem>
