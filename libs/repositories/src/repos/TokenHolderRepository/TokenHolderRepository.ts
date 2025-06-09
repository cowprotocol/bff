/* eslint-disable @typescript-eslint/no-unused-vars */
import { SupportedChainId } from '@cowprotocol/cow-sdk';

export const tokenHolderRepositorySymbol = Symbol.for('TokenHolderRepository');

export interface TokenHolderPoint {
  address: string;
  balance: string;
}

export interface TokenHolderRepository {
  getTopTokenHolders(
    chainId: SupportedChainId,
    tokenAddress: string
  ): Promise<TokenHolderPoint[] | null>;
}

export class TokenHolderRepositoryNoop implements TokenHolderRepository {
  async getTopTokenHolders(
    _chainId: SupportedChainId,
    _tokenAddress: string
  ): Promise<TokenHolderPoint[] | null> {
    return null;
  }
}
