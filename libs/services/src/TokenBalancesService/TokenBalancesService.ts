import {
  TokenBalancesRepository,
  tokenBalancesRepositorySymbol,
  TokenBalancesResponse,
} from '@cowprotocol/repositories';
import { SupportedChainId } from '@cowprotocol/cow-sdk';
import { inject, injectable } from 'inversify';

export interface TokenBalancesService {
  getTokenBalances({
    chainId,
    address,
  }: {
    chainId: SupportedChainId;
    address: string;
  }): Promise<TokenBalancesResponse>;
}

export const tokenBalancesServiceSymbol = Symbol.for('TokenBalancesService');

@injectable()
export class TokenBalancesServiceMain implements TokenBalancesService {
  constructor(
    @inject(tokenBalancesRepositorySymbol)
    private tokenBalancesRepository: TokenBalancesRepository
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
}
