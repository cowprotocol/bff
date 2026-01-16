import { injectable } from 'inversify';
import { SupportedChainId } from '@cowprotocol/cow-sdk';
import { CacheRepository } from '../CacheRepository/CacheRepository';
import {
  UserBalanceRepository,
  UserTokenBalance,
} from './UserBalanceRepository';
import { logger } from '@cowprotocol/shared';

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

  private async getCachedBalances(
    chainId: SupportedChainId,
    userAddress: string,
    tokenAddresses: string[]
  ): Promise<UserTokenBalance[]> {
    const cacheKey = this.getCacheKey(chainId, userAddress);
    const cached = await this.cacheRepository.get(cacheKey);
    if (!cached) {
      return [];
    }

    // Get the cached balances
    try {
      const cachedBalances: UserTokenBalance[] = JSON.parse(cached);

      // Return only the relevant tokens
      return cachedBalances.filter((balance) => {
        return tokenAddresses.some((tokenAddress) => {
          return (
            tokenAddress.toLowerCase() === balance.tokenAddress.toLowerCase()
          );
        });
      });
    } catch (error) {
      logger.warn(
        'Error parsing cached balances. Proceeding to fetch fresh data.',
        error
      );
      return [];
    }
  }

  async getUserTokenBalances(
    chainId: SupportedChainId,
    userAddress: string,
    tokenAddresses: string[]
  ): Promise<UserTokenBalance[]> {
    const t0 = Date.now();
    logger.info(
      { chainId, userAddress, tokenAddresses },
      '[UserBalanceRepositoryCache:getUserTokenBalances:debug99] start'
    );
    const cachedBalances = await this.getCachedBalances(
      chainId,
      userAddress,
      tokenAddresses
    );
    logger.info(
      { ms: Date.now() - t0, n: cachedBalances.length },
      '[UserBalanceRepositoryCache:getUserTokenBalances:debug99] cachedBalances: done'
    );
    // Group the cached balances by token address
    const cachedByToken = new Map(
      cachedBalances.map((balance) => [
        balance.tokenAddress.toLowerCase(),
        balance,
      ])
    );

    // Get the tokens that we don't have cached
    const missingTokenAddresses = tokenAddresses.filter((tokenAddress) => {
      return !cachedByToken.has(tokenAddress.toLowerCase());
    });

    // Return early if we have all the balances cached
    if (missingTokenAddresses.length == 0) {
      return cachedBalances;
    }

    // Fetch the missing balances
    const t1 = Date.now();
    const fetchedBalances =
      await this.userBalanceRepository.getUserTokenBalances(
        chainId,
        userAddress,
        missingTokenAddresses
      );
    logger.info(
      { ms: Date.now() - t1, n: fetchedBalances.length },
      '[UserBalanceRepositoryCache:getUserTokenBalances:debug99] fetchedBalances: done'
    );

    for (const balance of fetchedBalances) {
      cachedByToken.set(balance.tokenAddress.toLowerCase(), balance);
    }

    // Combine cached balances and fetched balances
    const mergedBalances = Array.from(cachedByToken.values());

    // Cache the results
    await this.cacheRepository.set(
      this.getCacheKey(chainId, userAddress),
      JSON.stringify(mergedBalances),
      this.cacheTimeSeconds
    );

    return mergedBalances;
  }
}
