import { injectable } from 'inversify';
import { SupportedChainId } from '@cowprotocol/cow-sdk';
import { CacheRepository } from '../CacheRepository/CacheRepository';
import {
  UserBalanceRepository,
  UserTokenBalance,
} from './UserBalanceRepository';

@injectable()
export class UserBalanceRepositoryCache implements UserBalanceRepository {
  constructor(
    private userBalanceRepository: UserBalanceRepository,
    private cacheRepository: CacheRepository,
    private cachePrefix: string,
    private cacheTimeSeconds: number
  ) {}

  private getCacheKey(
    chainId: SupportedChainId,
    userAddress: string,
    tokenAddress?: string
  ): string {
    const baseKey = `${
      this.cachePrefix
    }:${chainId}:${userAddress.toLowerCase()}`;
    if (tokenAddress) {
      return `${baseKey}:${tokenAddress.toLowerCase()}`;
    }
    return baseKey;
  }

  async getUserTokenBalances(
    chainId: SupportedChainId,
    userAddress: string,
    tokenAddresses: string[]
  ): Promise<UserTokenBalance[]> {
    const cacheKey = this.getCacheKey(chainId, userAddress);
    const cached = await this.cacheRepository.get(cacheKey);

    if (cached) {
      try {
        const cachedBalances: UserTokenBalance[] = JSON.parse(cached);
        // Filter cached results to only include requested tokens
        return cachedBalances.filter((balance) =>
          tokenAddresses.some((tokenAddress) => {
            return (
              tokenAddress.toLowerCase() === balance.tokenAddress.toLowerCase()
            );
          })
        );
      } catch (error) {
        // If parsing fails, continue to fetch fresh data
        console.warn(
          'Error parsing cached balances. Proceeding to fetch fresh data.',
          error
        );
      }
    }

    const balances = await this.userBalanceRepository.getUserTokenBalances(
      chainId,
      userAddress,
      tokenAddresses
    );

    // Cache the results
    await this.cacheRepository.set(
      cacheKey,
      JSON.stringify(balances),
      this.cacheTimeSeconds
    );

    return balances;
  }

  /**
   * Invalidate a cache for a token
   * @param chainId
   * @param userAddress
   * @param tokenAddress
   */
  async invalidateUserBalances(
    chainId: SupportedChainId,
    userAddress: string,
    tokenAddress?: string
  ): Promise<void> {
    const cacheKey = this.getCacheKey(chainId, userAddress, tokenAddress);
    // Invalidate using the TTL to zero
    await this.cacheRepository.set(cacheKey, '', 0);
  }
}
