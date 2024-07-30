export const cacheRepositorySymbol = Symbol.for('CacheRepository');

export interface CacheRepository {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl: number): Promise<void>;
}
