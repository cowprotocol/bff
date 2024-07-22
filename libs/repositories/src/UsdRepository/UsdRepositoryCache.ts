import { injectable } from 'inversify';
import {
  PricePoint,
  PriceStrategy,
  UsdRepository,
  deserializePricePoints,
  serializePricePoints,
} from './UsdRepository';
import { SupportedChainId } from '../types';
import IORedis from 'ioredis';
import ms from 'ms';
import { CacheRepository } from '../CacheRepository/CacheRepository';

const DEFAULT_CACHE_VALUE_SECONDS = ms('2min') / 1000; // 2min cache time by default for values
const DEFAULT_CACHE_NULL_SECONDS = ms('30min') / 1000; // 2min cache time by default for NULL values (when the repository don't know)
const NULL_VALUE = 'null';

@injectable()
export class UsdRepositoryCache implements UsdRepository {
  private baseCacheKey: string;

  constructor(
    private proxy: UsdRepository,
    private cache: CacheRepository,
    private cacheName: string,
    private cacheTimeValueSeconds: number = DEFAULT_CACHE_VALUE_SECONDS,
    private cacheTimeNullSeconds: number = DEFAULT_CACHE_NULL_SECONDS
  ) {
    this.baseCacheKey = `repos:${this.cacheName}`;
  }

  async getUsdPrice(
    chainId: SupportedChainId,
    tokenAddress: string
  ): Promise<number | null> {
    const key = `usdPrice:${chainId}:${tokenAddress}`;

    // Get price from cache
    const usdPriceCached = await this.getValueFromCache({
      key,
      convertFn: parseInt,
    });

    if (usdPriceCached !== undefined) {
      // Return cached price (if available)
      return usdPriceCached;
    }

    // Get the usd Price (delegate call)
    const usdPrice = await this.proxy.getUsdPrice(chainId, tokenAddress);

    // Cache price (or absence of it)
    this.cacheValue({
      key,
      value: usdPrice?.toString() || null,
    });

    return usdPrice;
  }
  async getUsdPrices(
    chainId: SupportedChainId,
    tokenAddress: string,
    priceStrategy: PriceStrategy
  ): Promise<PricePoint[] | null> {
    const key = `usdPrices:${chainId}:${tokenAddress}:${priceStrategy}`;

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
      chainId,
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

    const valueString = await this.cache.get(this.baseCacheKey + ':' + key);
    if (valueString) {
      return valueString === NULL_VALUE ? null : convertFn(valueString);
    }

    return undefined;
  }

  private async cacheValue<T>(props: {
    key: string;
    value: string | null;
  }): Promise<void> {
    const { key, value } = props;

    const cacheTimeSeconds =
      value === null ? this.cacheTimeNullSeconds : this.cacheTimeValueSeconds;

    await this.cache.set(
      this.baseCacheKey + ':' + key,
      value === null ? NULL_VALUE : value,
      cacheTimeSeconds
    );
  }
}
