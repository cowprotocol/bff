import { injectable } from 'inversify';
import { CacheRepository } from './CacheRepository';

@injectable()
export class CacheRepositoryFactory {
  private static createProxy<T extends object>(
    repository: T,
    cache: CacheRepository,
    cacheName: string,
    cacheTimeValueSeconds: number,
    cacheTimeNullSeconds: number
  ): T {
    const baseCacheKey = ['repos', cacheName];

    return new Proxy<T>(repository, {
      get: (target, prop: string | symbol) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return async (...args: any[]) => {
          const cacheKey = CacheRepositoryFactory.getCacheKey(
            baseCacheKey,
            prop.toString(),
            ...args
          );
          const cachedValue = await CacheRepositoryFactory.getValueFromCache(
            cache,
            cacheKey
          );

          if (cachedValue !== undefined) {
            return cachedValue;
          }

          const method = (target as any)[prop];
          if (typeof method === 'function') {
            const value = await method.apply(target, args);
            await CacheRepositoryFactory.cacheValue(
              cache,
              cacheKey,
              value,
              cacheTimeValueSeconds,
              cacheTimeNullSeconds
            );
            return value;
          }

          return undefined;
        };
      },
    });
  }

  static create<T extends object>(
    repository: T,
    cache: CacheRepository,
    cacheName: string,
    cacheTimeValueSeconds: number,
    cacheTimeNullSeconds: number
  ): T {
    return CacheRepositoryFactory.createProxy(
      repository,
      cache,
      cacheName,
      cacheTimeValueSeconds,
      cacheTimeNullSeconds
    );
  }
  private static getCacheKey(
    baseCacheKey: string[],
    method: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...args: any[]
  ): string {
    return [...baseCacheKey, method, ...args.map(String)].join(':');
  }

  private static async getValueFromCache(
    cache: CacheRepository,
    key: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any | undefined> {
    const valueString = await cache.get(key);
    if (valueString) {
      return valueString === 'null' ? null : JSON.parse(valueString);
    }
    return undefined;
  }

  private static async cacheValue(
    cache: CacheRepository,
    key: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any,
    cacheTimeValueSeconds: number,
    cacheTimeNullSeconds: number
  ): Promise<void> {
    const cacheTimeSeconds =
      value === null ? cacheTimeNullSeconds : cacheTimeValueSeconds;
    await cache.set(
      key,
      value === null ? 'null' : JSON.stringify(value),
      cacheTimeSeconds
    );
  }
}
