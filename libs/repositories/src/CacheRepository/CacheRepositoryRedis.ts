import { injectable } from 'inversify';
import { CacheRepository } from './CacheRepository';
import { Redis } from 'ioredis';

@injectable()
export class CacheRepositoryRedis implements CacheRepository {
  constructor(private redisClient: Redis) {}

  async get(key: string): Promise<string | null> {
    return this.redisClient.get(key);
  }

  async getTtl(key: string): Promise<number | null> {
    const ttl = await this.redisClient.ttl(key);

    if (ttl < 0) {
      return null;
    }

    return ttl;
  }

  async set(key: string, value: string, ttl: number): Promise<void> {
    await this.redisClient.set(key, value, 'EX', ttl);
  }
}
