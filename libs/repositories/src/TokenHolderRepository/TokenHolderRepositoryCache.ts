import { injectable } from 'inversify';
import {
  TokenHolderPoint,
  TokenHolderRepository,
} from './TokenHolderRepository';
import { CacheRepository } from '../CacheRepository/CacheRepository';
import { SupportedChainId } from '@cowprotocol/shared';
import { getCacheKey, PartialCacheKey } from '../utils/cache';

const NULL_VALUE = 'null';

@injectable()
export class TokenHolderRepositoryCache implements TokenHolderRepository {
  private baseCacheKey: PartialCacheKey[];

  constructor(
    private proxy: TokenHolderRepository,
    private cache: CacheRepository,
    cacheName: string,
    private cacheTimeSeconds: number
  ) {
    this.baseCacheKey = ['repos', cacheName];
  }

  async getTopTokenHolders(
    chainId: SupportedChainId,
    tokenAddress: string
  ): Promise<TokenHolderPoint[] | null> {
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
    const value = await this.proxy.getTopTokenHolders(chainId, tokenAddress);

    // Cache value
    const cacheValue = value === null ? NULL_VALUE : JSON.stringify(value);
    await this.cache.set(cacheKey, cacheValue, this.cacheTimeSeconds);

    return value;
  }
}
