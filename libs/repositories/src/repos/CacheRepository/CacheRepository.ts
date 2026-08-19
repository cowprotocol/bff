export const cacheRepositorySymbol = Symbol.for('CacheRepository')

export interface CacheRepository {
  get(key: string): Promise<string | null>
  getTtl(key: string): Promise<number | null>
  set(key: string, value: string, ttl: number): Promise<void>
  /**
   * Atomically reads and removes a key (get+delete in one step). Returns null if the key
   * doesn't exist. Use for single-use values where two concurrent readers must never both
   * observe the same value.
   */
  take(key: string): Promise<string | null>
}
