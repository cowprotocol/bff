import {
  Erc20,
  Erc20Repository,
  erc20RepositorySymbol,
} from '@cowprotocol/repositories';
import { toSupportedChainId } from '@cowprotocol/shared';
import { inject, injectable } from 'inversify';

export interface TokenDetailService {
  getTokenDetails(
    chainId: string,
    tokenAddress: string
  ): Promise<Erc20 | null>;

  getTokensDetails(
    chainId: string,
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
    chainId: string,
    tokenAddress: string
  ): Promise<Erc20 | null> {
    const supportedChainId = toSupportedChainId(chainId);
    return this.erc20Repository.get(supportedChainId, tokenAddress);
  }

  async getTokensDetails(
    chainId: string,
    tokenAddresses: string[]
  ): Promise<(Erc20 | null)[]> {
    const supportedChainId = toSupportedChainId(chainId);
    return Promise.all(
      tokenAddresses.map((address) =>
        this.erc20Repository.get(supportedChainId, address)
      )
    );
  }
}
