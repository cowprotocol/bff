import { SupportedChainId } from '@cowprotocol/cow-sdk';
import { injectable } from 'inversify';
import { Erc20, Erc20Repository } from './Erc20Repository';

@injectable()
export class Erc20RepositoryFallback implements Erc20Repository {
  constructor(private readonly repositories: Erc20Repository[]) {}

  async get(
    chainId: SupportedChainId,
    tokenAddress: string
  ): Promise<Erc20 | null> {
    for (const repository of this.repositories) {
      const result = await repository.get(chainId, tokenAddress);
      if (result !== null) {
        return result;
      }
    }
    return null;
  }
}
