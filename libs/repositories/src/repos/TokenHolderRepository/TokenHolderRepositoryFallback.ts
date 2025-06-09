import { injectable } from 'inversify';
import {
  TokenHolderPoint,
  TokenHolderRepository,
} from './TokenHolderRepository';
import { SupportedChainId } from '@cowprotocol/cow-sdk';

@injectable()
export class TokenHolderRepositoryFallback implements TokenHolderRepository {
  constructor(private tokenHolderRepositories: TokenHolderRepository[]) {}

  async getTopTokenHolders(
    chainId: SupportedChainId,
    tokenAddress: string
  ): Promise<TokenHolderPoint[] | null> {
    for (const tokenHolderRepository of this.tokenHolderRepositories) {
      const tokenHolders = await tokenHolderRepository.getTopTokenHolders(
        chainId,
        tokenAddress
      );
      if (tokenHolders !== null) {
        return tokenHolders;
      }
    }
    return null;
  }
}
