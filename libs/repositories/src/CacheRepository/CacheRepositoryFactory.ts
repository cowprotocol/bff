import { injectable } from 'inversify';
import { CacheRepository } from './CacheRepository';

type SerializeFunction = (value: any) => string;
type DeserializeFunction = (value: string) => any;

type MethodConfig = {
  serialize: SerializeFunction;
  deserialize: DeserializeFunction;
};

type ConvertFns<T> = {
  [K in keyof T]?: MethodConfig;
};
@injectable()
export class CacheRepositoryFactory {
  private static createProxy<T extends object>(
    repository: T,
    cache: CacheRepository,
    cacheName: string,
    cacheTimeValueSeconds: number,
    cacheTimeNullSeconds: number,
    convertFns: ConvertFns<T>
  ): T {
    const baseCacheKey = ['repos', cacheName];

    return new Proxy<T>(repository, {
      get: (target, prop: string | symbol) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return async (...args: any[]) => {
          const method = prop as keyof T;
          const cacheKey = CacheRepositoryFactory.getCacheKey(
            baseCacheKey,
            prop.toString(),
            ...args
          );
          const cachedValue = await CacheRepositoryFactory.getValueFromCache(
            cache,
            cacheKey
          );

          const methodConvertFn = convertFns?.[method];

          if (!methodConvertFn) {
            console.error('No convert function found for method', method);
          }

          if (cachedValue !== undefined && methodConvertFn) {
            return cachedValue === null
              ? cachedValue
              : methodConvertFn.deserialize(cachedValue);
          }

          const originalMethod = (target as any)[method];
          if (typeof originalMethod == 'function') {
            const value = await originalMethod.apply(target, args);
            if (methodConvertFn) {
              await CacheRepositoryFactory.cacheValue(
                cache,
                cacheKey,
                value,
                cacheTimeValueSeconds,
                cacheTimeNullSeconds,
                methodConvertFn.serialize
              );
            }
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
    cacheTimeNullSeconds: number,
    convertFns: ConvertFns<T>
  ): T {
    return CacheRepositoryFactory.createProxy(
      repository,
      cache,
      cacheName,
      cacheTimeValueSeconds,
      cacheTimeNullSeconds,
      convertFns
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
  ): Promise<string | null | undefined> {
    const valueString = await cache.get(key);
    if (valueString) {
      return valueString === 'null' ? null : valueString;
    }
    return undefined;
  }

  private static async cacheValue(
    cache: CacheRepository,
    key: string,
    value: any,
    cacheTimeValueSeconds: number,
    cacheTimeNullSeconds: number,
    serialize: SerializeFunction
  ): Promise<void> {
    const cacheTimeSeconds =
      value === null ? cacheTimeNullSeconds : cacheTimeValueSeconds;
    await cache.set(
      key,
      value === null ? 'null' : serialize(value),
      cacheTimeSeconds
    );
  }
}
