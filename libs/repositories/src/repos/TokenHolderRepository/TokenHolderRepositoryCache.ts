import { injectable } from 'inversify';
import { SupportedChainId } from '@cowprotocol/shared';
import { CacheRepository } from '../CacheRepository/CacheRepository';
import { getCacheKey, PartialCacheKey } from '../utils/cache';
import {
  TokenHolderPoint,
  TokenHolderRepository,
} from './TokenHolderRepository';

const NULL_VALUE = 'null';

@injectable()
export class TokenHolderRepositoryCache implements TokenHolderRepository {
  private baseCacheKey: PartialCacheKey[];

  constructor(
    private proxy: TokenHolderRepository,
    private cache: CacheRepository,
    private cacheName: string,
    private cacheTimeValueSeconds: number,
    private cacheTimeNullSeconds: number
  ) {
    this.baseCacheKey = ['repos', this.cacheName];
  }

  async getTopTokenHolders(
    chainId: SupportedChainId,
    tokenAddress: string
  ): Promise<TokenHolderPoint[] | null> {
    // Get price from cache
    const key = getCacheKey(
      ...this.baseCacheKey,
      'usd-price',
      chainId,
      tokenAddress
    );
    const holdersCache = await this.getValueFromCache({
      key,
    });

    if (holdersCache !== undefined) {
      return holdersCache;
    }

    const tokenHolders = await this.proxy.getTopTokenHolders(
      chainId,
      tokenAddress
    );

    // Cache price (or absence of it)
    this.cacheValue({
      key,
      value: tokenHolders || null,
    });

    return tokenHolders;
  }

  private async getValueFromCache(props: {
    key: string;
  }): Promise<TokenHolderPoint[] | null | undefined> {
    const { key } = props;

    const valueString = await this.cache.get(key);
    if (valueString) {
      return valueString === NULL_VALUE ? null : JSON.parse(valueString);
    }

    return undefined;
  }

  private async cacheValue(props: {
    key: string;
    value: TokenHolderPoint[] | null;
  }): Promise<void> {
    const { key, value } = props;

    const cacheTimeSeconds =
      value === null ? this.cacheTimeNullSeconds : this.cacheTimeValueSeconds;

    await this.cache.set(
      key,
      value === null ? NULL_VALUE : JSON.stringify(value),
      cacheTimeSeconds
    );
  }
}
