import { injectable } from 'inversify';
import { CacheRepository } from '../CacheRepository/CacheRepository';
import { getCacheKey, PartialCacheKey } from '../utils/cache';
import {
  deserializePricePoints,
  PricePoint,
  PriceStrategy,
  serializePricePoints,
  UsdRepository,
} from './UsdRepository';

const NULL_VALUE = 'null';

@injectable()
export class UsdRepositoryCache implements UsdRepository {
  private baseCacheKey: PartialCacheKey[];

  constructor(
    private proxy: UsdRepository,
    private cache: CacheRepository,
    private cacheName: string,
    private cacheTimeValueSeconds: number,
    private cacheTimeNullSeconds: number
  ) {
    this.baseCacheKey = ['repos', this.cacheName];
  }

  async getUsdPrice(
    chainIdOrSlug: number | string,
    tokenAddress?: string | undefined
  ): Promise<number | null> {
    // Get price from cache
    const key = getCacheKey(
      ...this.baseCacheKey,
      'usd-price',
      chainIdOrSlug,
      tokenAddress || ''
    );
    const usdPriceCached = await this.getValueFromCache({
      key,
      convertFn: parseFloat,
    });

    if (usdPriceCached !== undefined) {
      // Return cached price (if available)
      return usdPriceCached;
    }

    // Get the usd Price (delegate call)
    const usdPrice = await this.proxy.getUsdPrice(chainIdOrSlug, tokenAddress);

    // Cache price (or absence of it)
    this.cacheValue({
      key,
      value: usdPrice?.toString() || null,
    });

    return usdPrice;
  }
  async getUsdPrices(
    chainIdOrSlug: number | string,
    tokenAddress: string | undefined,
    priceStrategy: PriceStrategy
  ): Promise<PricePoint[] | null> {
    const key = getCacheKey(
      ...this.baseCacheKey,
      'usd-prices',
      chainIdOrSlug,
      tokenAddress || '',
      priceStrategy
    );

    // Get price from cache
    const usdPriceCached = await this.getValueFromCache({
      key,
      convertFn: deserializePricePoints,
    });

    if (usdPriceCached !== undefined) {
      // Return cached prices (if available)
      return usdPriceCached;
    }

    // Get the usd Prices (delegate call)
    const usdPrices = await this.proxy.getUsdPrices(
      chainIdOrSlug,
      tokenAddress,
      priceStrategy
    );

    // Cache prices (or absence of it)
    this.cacheValue({
      key,
      value: usdPrices ? serializePricePoints(usdPrices) : null,
    });

    return usdPrices;
  }

  private async getValueFromCache<T>(props: {
    key: string;
    convertFn: (value: string) => T;
  }): Promise<T | null | undefined> {
    const { key, convertFn } = props;

    const valueString = await this.cache.get(key);
    if (valueString) {
      return valueString === NULL_VALUE ? null : convertFn(valueString);
    }

    return undefined;
  }

  private async cacheValue(props: {
    key: string;
    value: string | null;
  }): Promise<void> {
    const { key, value } = props;

    const cacheTimeSeconds =
      value === null ? this.cacheTimeNullSeconds : this.cacheTimeValueSeconds;

    await this.cache.set(
      key,
      value === null ? NULL_VALUE : value,
      cacheTimeSeconds
    );
  }
}
