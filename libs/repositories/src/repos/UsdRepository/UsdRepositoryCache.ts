import { injectable } from 'inversify'
import { logger } from '@cowprotocol/shared'
import { getCacheKey, PartialCacheKey } from '../../utils/cache'
import { CacheRepository } from '../CacheRepository/CacheRepository'
import { deserializePricePoints, PricePoint, PriceStrategy, serializePricePoints, UsdRepository } from './UsdRepository'

const NULL_VALUE = 'null'
const ERROR_VALUE = 'error'

/**
 * How long an upstream failure is remembered.
 *
 * A failure now throws instead of returning null, which means it never reaches the NULL cache. Without
 * a short memory of its own, an upstream outage turns every single request into a fresh upstream call:
 * the cache stops absorbing traffic exactly when the upstream can least afford it, and the logs fill
 * with one failure per request. Deliberately short, so recovery is picked up almost immediately.
 */
const CACHE_ERROR_SECONDS = 20

@injectable()
export class UsdRepositoryCache implements UsdRepository {
  private baseCacheKey: PartialCacheKey[]

  constructor(
    private proxy: UsdRepository,
    private cache: CacheRepository,
    private cacheName: string,
    private cacheTimeValueSeconds: number,
    private cacheTimeNullSeconds: number
  ) {
    this.baseCacheKey = ['repos', this.cacheName]
  }

  get name(): string {
    return this.proxy.name
  }

  async getUsdPrice(chainIdOrSlug: string, tokenAddress?: string | undefined): Promise<number | null> {
    // Get price from cache
    const key = getCacheKey(...this.baseCacheKey, 'usd-price', chainIdOrSlug, tokenAddress || '')
    const usdPriceCached = await this.getValueFromCache({
      key,
      convertFn: parseFloat,
    })

    if (usdPriceCached !== undefined) {
      // Return cached price (if available)
      return usdPriceCached
    }

    // Get the usd Price (delegate call)
    const usdPrice = await this.getFromProxy(key, () => this.proxy.getUsdPrice(chainIdOrSlug, tokenAddress))

    // Cache price (or absence of it)
    this.cacheValue({
      key,
      value: usdPrice?.toString() || null,
    })

    return usdPrice
  }
  async getUsdPrices(
    chainIdOrSlug: string,
    tokenAddress: string | undefined,
    priceStrategy: PriceStrategy
  ): Promise<PricePoint[] | null> {
    const key = getCacheKey(...this.baseCacheKey, 'usd-prices', chainIdOrSlug, tokenAddress || '', priceStrategy)

    // Get price from cache
    const usdPriceCached = await this.getValueFromCache({
      key,
      convertFn: deserializePricePoints,
    })

    if (usdPriceCached !== undefined) {
      // Return cached prices (if available)
      return usdPriceCached
    }

    // Get the usd Prices (delegate call)
    const usdPrices = await this.getFromProxy(key, () =>
      this.proxy.getUsdPrices(chainIdOrSlug, tokenAddress, priceStrategy)
    )

    // Cache prices (or absence of it)
    this.cacheValue({
      key,
      value: usdPrices ? serializePricePoints(usdPrices) : null,
    })

    return usdPrices
  }

  /**
   * Delegates to the proxy, remembering a failure briefly so an outage doesn't turn every request
   * into a fresh upstream call. The error is rethrown either way, so the fallback still moves on to
   * the next price source.
   */
  private async getFromProxy<T>(key: string, getResult: () => Promise<T>): Promise<T> {
    try {
      return await getResult()
    } catch (error) {
      this.cacheValue({ key, value: ERROR_VALUE, cacheTimeSeconds: CACHE_ERROR_SECONDS })
      throw error
    }
  }

  private async getValueFromCache<T>(props: {
    key: string
    convertFn: (value: string) => T
  }): Promise<T | null | undefined> {
    const { key, convertFn } = props

    const valueString = await this.cache.get(key)
    if (valueString) {
      // A remembered failure. Rethrow rather than reporting "no price", so this stays distinguishable
      // from a token the upstream genuinely doesn't know.
      if (valueString === ERROR_VALUE) {
        throw new Error(`${this.name} failed within the last ${CACHE_ERROR_SECONDS}s, not retrying yet`)
      }

      return valueString === NULL_VALUE ? null : convertFn(valueString)
    }

    return undefined
  }

  private cacheValue(props: { key: string; value: string | null; cacheTimeSeconds?: number }): void {
    const { key, value } = props

    const cacheTimeSeconds =
      props.cacheTimeSeconds ?? (value === null ? this.cacheTimeNullSeconds : this.cacheTimeValueSeconds)

    // Fire and forget: a cache write must never fail the request it belongs to, but the rejection has
    // to be handled or it becomes an unhandled rejection and takes the pod down on current Node.
    this.cache.set(key, value === null ? NULL_VALUE : value, cacheTimeSeconds).catch((error) => {
      logger.warn(`UsdRepositoryCache: failed to cache ${key}: ${error instanceof Error ? error.message : error}`)
    })
  }
}
