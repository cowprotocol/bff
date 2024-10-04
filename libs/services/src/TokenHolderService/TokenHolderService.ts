import {
  TokenHolderRepository,
  tokenHolderRepositorySymbol,
  SupportedChainId,
  TokenHolderPoint,
} from '@cowprotocol/repositories';
import { injectable, inject } from 'inversify';

export interface TokenHolderService {
  getTopTokenHolders(
    chainId: SupportedChainId,
    tokenAddress: string
  ): Promise<TokenHolderPoint[] | null>;
}

export const tokenHolderServiceSymbol = Symbol.for('TokenHolderService');

@injectable()
export class TokenHolderServiceMain implements TokenHolderService {
  constructor(
    @inject(tokenHolderRepositorySymbol)
    private usdRepository: TokenHolderRepository
  ) {}

  async getTopTokenHolders(
    chainId: SupportedChainId,
    tokenAddress: string
  ): Promise<TokenHolderPoint[] | null> {
    return this.usdRepository.getTopTokenHolders(chainId, tokenAddress);
  }
}
