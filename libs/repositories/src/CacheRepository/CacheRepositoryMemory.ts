import { injectable } from 'inversify';
import NodeCache from 'node-cache';
import { CacheRepository } from './CacheRepository';

@injectable()
export class CacheRepositoryMemory implements CacheRepository {
  static cache: NodeCache = new NodeCache();

  async get(key: string): Promise<string | null> {
    const value = await CacheRepositoryMemory.cache.get<string>(key);

    return value ?? null;
  }

  async getTtl(key: string): Promise<number | null> {
    const ttlEpoch = (await CacheRepositoryMemory.cache.getTtl(key)) || null;

    if (ttlEpoch === null) {
      return null;
    }

    return Math.floor((ttlEpoch - Date.now()) / 1000);
  }

  async set(key: string, value: string, ttl: number): Promise<void> {
    await CacheRepositoryMemory.cache.set(key, value, ttl);
  }
}
