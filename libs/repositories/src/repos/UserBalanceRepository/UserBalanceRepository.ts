import { SupportedChainId } from '@cowprotocol/cow-sdk';

export const userBalanceRepositorySymbol = Symbol.for('UserBalanceRepository');

export interface UserTokenBalance {
  tokenAddress: string;
  balance: string;
  allowance: string;
}

export interface UserBalanceRepository {
  getUserTokenBalances(
    chainId: SupportedChainId,
    userAddress: string,
    tokenAddresses: string[]
  ): Promise<UserTokenBalance[]>;
}
