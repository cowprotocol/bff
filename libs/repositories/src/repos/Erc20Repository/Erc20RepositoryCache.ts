import { injectable } from 'inversify';
import { Erc20, Erc20Repository } from './Erc20Repository';
import { CacheRepository } from '../CacheRepository/CacheRepository';
import { SupportedChainId } from '@cowprotocol/cow-sdk';
import { getCacheKey, PartialCacheKey } from '../../utils/cache';

const NULL_VALUE = 'null';

@injectable()
export class Erc20RepositoryCache implements Erc20Repository {
  private baseCacheKey: PartialCacheKey[];

  constructor(
    private proxy: Erc20Repository,
    private cache: CacheRepository,
    cacheName: string,
    private cacheTimeSeconds: number
  ) {
    this.baseCacheKey = ['repos', cacheName];
  }

  async get(
    chainId: SupportedChainId,
    tokenAddress: string
  ): Promise<Erc20 | null> {
    // Get cached value
    const cacheKey = getCacheKey(
      ...this.baseCacheKey,
      'get',
      chainId,
      tokenAddress
    );
    const valueString = await this.cache.get(cacheKey);
    if (valueString) {
      return valueString === NULL_VALUE ? null : JSON.parse(valueString);
    }

    // Get fresh value from proxy
    const value = await this.proxy.get(chainId, tokenAddress);

    // Cache value
    const cacheValue = value === null ? NULL_VALUE : JSON.stringify(value);
    await this.cache.set(cacheKey, cacheValue, this.cacheTimeSeconds);

    return value;
  }
}
