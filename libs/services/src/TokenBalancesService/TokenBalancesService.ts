import {
  Erc20,
  Erc20Repository,
  erc20RepositorySymbol,
  TokenBalancesRepository,
  tokenBalancesRepositorySymbol,
  TokenBalancesResponse,
  UserBalanceRepository,
  userBalanceRepositorySymbol,
} from '@cowprotocol/repositories';
import { SupportedChainId } from '@cowprotocol/cow-sdk';
import { inject, injectable } from 'inversify';
import { logger } from '@cowprotocol/shared';

export interface UserTokenBalanceWithToken {
  balance: string;
  allowance: string;
  token: Erc20;
}

export interface TokenBalancesService {
  getTokenBalances({
    chainId,
    address,
  }: {
    chainId: SupportedChainId;
    address: string;
  }): Promise<TokenBalancesResponse>;

  getUserTokenBalances(params: {
    chainId: SupportedChainId;
    userAddress: string;
    tokenAddresses: string[];
  }): Promise<UserTokenBalanceWithToken[]>;
}

export const tokenBalancesServiceSymbol = Symbol.for('TokenBalancesService');

@injectable()
export class TokenBalancesServiceMain implements TokenBalancesService {
  constructor(
    @inject(tokenBalancesRepositorySymbol)
    private tokenBalancesRepository: TokenBalancesRepository,
    @inject(erc20RepositorySymbol)
    private erc20Repository: Erc20Repository,
    @inject(userBalanceRepositorySymbol)
    private userBalanceRepository: UserBalanceRepository
  ) {}

  async getTokenBalances({
    chainId,
    address,
  }: {
    chainId: SupportedChainId;
    address: string;
  }): Promise<TokenBalancesResponse> {
    return this.tokenBalancesRepository.getTokenBalances({ chainId, address });
  }

  /**
   * Get the list of token infos for the given token addresses
   *
   * @param chainId The chain ID
   * @param tokenAddresses The list of token addresses
   * @returns The list of token infos
   */
  private async getTokenInfos(
    chainId: SupportedChainId,
    tokenAddresses: string[]
  ): Promise<Erc20[]> {
    const tokens: Erc20[] = [];

    for (const tokenAddress of tokenAddresses) {
      // TODO: Potentially consider adding a getAll method in the repository
      const token = await this.erc20Repository.get(chainId, tokenAddress);
      if (!token) {
        logger.warn(
          `Token ${tokenAddress} not found for chain ${chainId}. Skipping.`
        );
        continue;
      }

      tokens.push({
        address: token.address ?? tokenAddress,
        decimals: token.decimals,
        symbol: token.symbol,
        name: token.name,
      });
    }

    return tokens;
  }

  async getUserTokenBalances({
    chainId,
    userAddress,
    tokenAddresses,
  }: {
    chainId: SupportedChainId;
    userAddress: string;
    tokenAddresses: string[];
  }): Promise<UserTokenBalanceWithToken[]> {
    const balancesPromise = this.userBalanceRepository.getUserTokenBalances(
      chainId,
      userAddress,
      tokenAddresses
    );
    const tokensPromise = this.getTokenInfos(chainId, tokenAddresses);

    const [balances, tokens] = await Promise.all([
      balancesPromise,
      tokensPromise,
    ]);

    const tokensByAddress = new Map(
      tokens.map((token) => [token.address.toLowerCase(), token])
    );

    return balances
      .map((balance) => {
        const token = tokensByAddress.get(balance.tokenAddress.toLowerCase());
        if (!token) {
          return null;
        }

        return {
          balance: balance.balance,
          allowance: balance.allowance,
          token,
        };
      })
      .filter(
        (balance): balance is UserTokenBalanceWithToken => balance !== null
      );
  }
}
