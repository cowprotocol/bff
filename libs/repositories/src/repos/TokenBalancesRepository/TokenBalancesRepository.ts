import { SupportedChainId } from '@cowprotocol/cow-sdk';

export const tokenBalancesRepositorySymbol = Symbol.for('TokenBalancesRepository');

export interface TokenBalanceParams {
  address: string;
  chainId: SupportedChainId,
}

export type TokenBalancesResponse = Record<string, string> | null;

export interface TokenBalancesRepository {
  getTokenBalances({ address, chainId }: TokenBalanceParams): Promise<TokenBalancesResponse>;
}

export class TokenBalancesNoop implements TokenBalancesRepository {
  async getTokenBalances(_params: TokenBalanceParams): Promise<TokenBalancesResponse> {
    return null;
  }
}