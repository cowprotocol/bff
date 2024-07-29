export const cacheRepositorySymbol = Symbol.for('CacheRepository');

export const NULL_VALUE = 'null';

export interface CacheRepository {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl: number): Promise<void>;
}
