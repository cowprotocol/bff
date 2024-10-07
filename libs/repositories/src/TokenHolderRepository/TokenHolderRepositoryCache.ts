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
    private cacheTimeValueSeconds: number,
    private cacheTimeNullSeconds: number
  ) {
    this.baseCacheKey = ['repos', cacheName];
  }

  async getTopTokenHolders(
    chainId: SupportedChainId,
    tokenAddress: string
  ): Promise<TokenHolderPoint[] | null> {
    const cacheKey = getCacheKey(
      ...this.baseCacheKey,
      'get',
      chainId,
      tokenAddress
    );
    const cachedValue = await this.getValueFromCache<TokenHolderPoint[]>({
      key: cacheKey,
      convertFn: JSON.parse,
    });

    if (cachedValue !== undefined) {
      return cachedValue;
    }

    const value = await this.proxy.getTopTokenHolders(chainId, tokenAddress);

    const cacheValue = value === null ? NULL_VALUE : JSON.stringify(value);
    await this.cacheValue({ key: cacheKey, value: cacheValue });

    return value;
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
