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

const DEFAULT_CACHE_TIME_SECONDS = 120; // 2min cache time by default for USD prices
const NULL_VALUE = 'null';

@injectable()
export class UsdRepositoryRedis implements UsdRepository {
  private baseCacheKey: string;

  constructor(
    private proxy: UsdRepository,
    private redisClient: IORedis,
    private cacheName: string,
    private cacheTimeSeconds: number = DEFAULT_CACHE_TIME_SECONDS
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

    const valueString = await this.redisClient.get(
      this.baseCacheKey + ':' + key
    );
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

    await this.redisClient.set(
      this.baseCacheKey + ':' + key,
      value === null ? NULL_VALUE : value,
      'EX',
      this.cacheTimeSeconds
    );
  }
}
