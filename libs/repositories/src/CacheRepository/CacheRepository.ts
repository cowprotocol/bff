export const cacheRepositorySymbol = Symbol.for('CacheRepository');

export interface CacheRepository {
  get(key: string): Promise<string | null>;
  getTtl(key: string): Promise<number | null>;
  set(key: string, value: string, ttl: number): Promise<void>;
}
