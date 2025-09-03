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
    const serializedTokens = JSON.stringify(tokens);

    await this.redisClient.set(key, serializedTokens, 'EX', ttlSeconds);
  }

  async getTokenList(
    chainId: SupportedChainId
  ): Promise<TokenFromAPI[] | null> {
    const key = this.getKey(chainId);
    const serializedTokens = await this.redisClient.get(key);

    if (!serializedTokens) {
      return null;
    }

    try {
      return JSON.parse(serializedTokens) as TokenFromAPI[];
    } catch (error) {
      // If parsing fails, clear the corrupted data
      await this.clearTokenList(chainId);
      return null;
    }
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

  async hasTokenList(chainId: SupportedChainId): Promise<boolean> {
    const key = this.getKey(chainId);
    const exists = await this.redisClient.exists(key);
    return exists === 1;
  }

  async clearTokenList(chainId: SupportedChainId): Promise<void> {
    const key = this.getKey(chainId);
    await this.redisClient.del(key);
  }
}
