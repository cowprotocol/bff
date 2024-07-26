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

  async set(key: string, value: string, ttl: number): Promise<void> {
    await CacheRepositoryMemory.cache.set(key, value, ttl);
  }
}
