import { injectable } from 'inversify';
import { CacheRepository } from './CacheRepository';

@injectable()
export class CacheRepositoryRedis implements CacheRepository {
  constructor(private redisClient: any) {}

  async get(key: string): Promise<string | null> {
    return this.redisClient.get(key);
  }

  async set(key: string, value: string, ttl: number): Promise<void> {
    await this.redisClient.set(key, value, 'EX', ttl);
  }
}
