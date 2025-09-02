import { SupportedChainId } from '@cowprotocol/cow-sdk';
import { Erc20, Erc20Repository } from './Erc20Repository';
import { Erc20RepositoryFallback } from './Erc20RepositoryFallback';

class RepoReturns implements Erc20Repository {
  constructor(private value: Erc20 | null) {}
  async get(): Promise<Erc20 | null> {
    return this.value;
  }
}

describe('Erc20RepositoryFallback', () => {
  const chainId = SupportedChainId.MAINNET;
  const token = '0x0000000000000000000000000000000000000001';

  it('returns first non-null result', async () => {
    const repo1 = new RepoReturns({ address: '0x1', name: 'ONE' });
    const repo2 = new RepoReturns({ address: '0x2', name: 'TWO' });
    const fallback = new Erc20RepositoryFallback([repo1, repo2]);

    const result = await fallback.get(chainId, token);
    expect(result?.address).toEqual('0x1');
  });

  it('falls back to second when first returns null', async () => {
    const repo1 = new RepoReturns(null);
    const repo2 = new RepoReturns({ address: '0x2', name: 'TWO' });
    const fallback = new Erc20RepositoryFallback([repo1, repo2]);

    const result = await fallback.get(chainId, token);
    expect(result?.address).toEqual('0x2');
  });

  it('returns null when all repositories return null', async () => {
    const repo1 = new RepoReturns(null);
    const repo2 = new RepoReturns(null);
    const fallback = new Erc20RepositoryFallback([repo1, repo2]);

    const result = await fallback.get(chainId, token);
    expect(result).toBeNull();
  });
});
