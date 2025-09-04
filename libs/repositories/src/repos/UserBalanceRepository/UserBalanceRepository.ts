import { SupportedChainId } from '@cowprotocol/cow-sdk';

export const userBalanceRepositorySymbol = Symbol.for('UserBalanceRepository');

export interface UserTokenBalance {
  tokenAddress: string;
  balance: string;
  allowance: string;
  decimals: number; // TODO: Maybe we don't need this. Read bellow
  symbol?: string; // TODO: Unsure if we want to return this. Actually, I think instead we should use Erc20Repository to get the symbol, name, etc. (in the service layer). Leaving for now, since its nice for debugging. Hacking modeeeeeee!
  name?: string; // TODO: Same as above
}

export interface UserBalanceRepository {
  getUserTokenBalances(
    chainId: SupportedChainId,
    userAddress: string,
    tokenAddresses: string[] // TODO: We could do a different repository that returns the list of tokens for our common lists. This way, the UI could just pass a list (which is highly cacheable) and a list of their additional tokens to this repository. But this repository is simpler, loads the tokens from a list of addresses
  ): Promise<UserTokenBalance[]>;
}
