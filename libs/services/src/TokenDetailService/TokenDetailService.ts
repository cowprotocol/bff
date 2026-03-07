import {
  Erc20,
  Erc20Repository,
  erc20RepositorySymbol,
} from '@cowprotocol/repositories';
import { SupportedChainId } from '@cowprotocol/cow-sdk';
import { inject, injectable } from 'inversify';

export interface TokenDetailService {
  getTokenDetails(
    chainId: SupportedChainId,
    tokenAddress: string
  ): Promise<Erc20 | null>;

  getTokensDetails(
    chainId: SupportedChainId,
    tokenAddresses: string[]
  ): Promise<(Erc20 | null)[]>;
}

export const tokenDetailServiceSymbol = Symbol.for('TokenDetailService');

@injectable()
export class TokenDetailServiceMain implements TokenDetailService {
  constructor(
    @inject(erc20RepositorySymbol)
    private erc20Repository: Erc20Repository
  ) {}

  async getTokenDetails(
    chainId: SupportedChainId,
    tokenAddress: string
  ): Promise<Erc20 | null> {
    return this.erc20Repository.get(chainId, tokenAddress);
  }

  async getTokensDetails(
    chainId: SupportedChainId,
    tokenAddresses: string[]
  ): Promise<(Erc20 | null)[]> {
    return Promise.all(
      tokenAddresses.map((address) =>
        this.erc20Repository.get(chainId, address)
      )
    );
  }
}
