import { injectable } from 'inversify';
import { Redis } from 'ioredis';
import { SupportedChainId } from '@cowprotocol/cow-sdk';
import { TokenFromAPI } from '../../datasources/tokenSearch/types';
import { TokenCacheRepository } from './TokenCacheRepository';

@injectable()
export class TokenCacheRepositoryRedis implements TokenCacheRepository {
  private readonly keyPrefix = 'tokens:';
  private readonly defaultTtl = 24 * 60 * 60; // 24 hours in seconds

  constructor(private redisClient: Redis) {}

  private getKey(chainId: SupportedChainId): string {
    return `${this.keyPrefix}${chainId}`;
  }

  async initTokenList(
    chainId: SupportedChainId,
    tokens: TokenFromAPI[],
    ttlSeconds: number = this.defaultTtl
  ): Promise<void> {
    const key = this.getKey(chainId);

    // Clear existing hash if it exists
    await this.redisClient.del(key);

    if (tokens.length === 0) {
      return;
    }

    const hashData: Record<string, string> = {};
    for (const token of tokens) {
      hashData[token.address.toLowerCase()] = JSON.stringify(token);
    }

    await this.redisClient.hset(key, hashData);

    await this.redisClient.expire(key, ttlSeconds);
  }

  async getTokenList(
    chainId: SupportedChainId
  ): Promise<TokenFromAPI[] | null> {
    const key = this.getKey(chainId);
    const hashData = await this.redisClient.hgetall(key);

    if (!hashData || Object.keys(hashData).length === 0) {
      return null;
    }

    const tokens: TokenFromAPI[] = [];

    for (const [address, serializedToken] of Object.entries(hashData)) {
      try {
        const token = JSON.parse(serializedToken) as TokenFromAPI;
        tokens.push(token);
      } catch (error) {
        await this.redisClient.hdel(key, address);
        console.warn(
          `Failed to parse token data for address ${address}, removed from cache`
        );
      }
    }

    return tokens.length > 0 ? tokens : null;
  }

  async searchTokens(
    chainId: SupportedChainId,
    searchParam: string
  ): Promise<TokenFromAPI[]> {
    const tokens = await this.getTokenList(chainId);

    if (!tokens) {
      return [];
    }

    const trimmedSearchParam = searchParam.trim().toLowerCase();

    return tokens.filter(
      (token) =>
        token.name.toLowerCase().includes(trimmedSearchParam) ||
        token.symbol.toLowerCase().includes(trimmedSearchParam) ||
        token.address.toLowerCase().includes(trimmedSearchParam)
    );
  }

  async clearTokenList(chainId: SupportedChainId): Promise<void> {
    const key = this.getKey(chainId);
    await this.redisClient.del(key);
  }
}
