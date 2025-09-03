import { SupportedChainId } from '@cowprotocol/cow-sdk';
import { TokenFromAPI } from '../../datasources/tokenSearch/types';

export const tokenCacheRepositorySymbol = Symbol.for('TokenCacheRepository');

export interface TokenCacheRepository {
  /**
   * Initialize token list for a specific chain
   * @param chainId - The chain ID to initialize tokens for
   * @param tokens - Array of tokens to cache
   * @param ttlSeconds - Time to live in seconds (default: 24 hours)
   */
  initTokenList(
    chainId: SupportedChainId,
    tokens: TokenFromAPI[],
    ttlSeconds?: number
  ): Promise<void>;

  /**
   * Get tokens for a specific chain
   * @param chainId - The chain ID to get tokens for
   * @returns Array of tokens or null if not cached
   */
  getTokenList(chainId: SupportedChainId): Promise<TokenFromAPI[] | null>;

  /**
   * Search tokens by parameter (name, symbol, or address)
   * @param chainId - The chain ID to search in
   * @param searchParam - Search parameter
   * @returns Array of matching tokens
   */
  searchTokens(
    chainId: SupportedChainId,
    searchParam: string
  ): Promise<TokenFromAPI[]>;

  /**
   * Check if token list exists for a chain
   * @param chainId - The chain ID to check
   * @returns True if token list exists and is not expired
   */
  hasTokenList(chainId: SupportedChainId): Promise<boolean>;

  /**
   * Clear token list for a specific chain
   * @param chainId - The chain ID to clear
   */
  clearTokenList(chainId: SupportedChainId): Promise<void>;
}
