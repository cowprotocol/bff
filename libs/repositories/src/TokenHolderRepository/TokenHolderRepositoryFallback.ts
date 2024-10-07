import { injectable } from 'inversify';
import {
  TokenHolderPoint,
  TokenHolderRepository,
} from './TokenHolderRepository';
import { SupportedChainId } from '@cowprotocol/shared';

@injectable()
export class TokenHolderRepositoryFallback implements TokenHolderRepository {
  constructor(private usdRepositories: TokenHolderRepository[]) {}

  async getTopTokenHolders(
    chainId: SupportedChainId,
    tokenAddress: string
  ): Promise<TokenHolderPoint[] | null> {
    for (const usdRepository of this.usdRepositories) {
      const price = await usdRepository.getTopTokenHolders(
        chainId,
        tokenAddress
      );
      if (price !== null) {
        return price;
      }
    }
    return null;
  }
}
