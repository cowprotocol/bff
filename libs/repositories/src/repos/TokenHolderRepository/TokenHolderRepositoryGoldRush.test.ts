import { SupportedChainId } from '@cowprotocol/shared';
import { Container } from 'inversify';
import { NULL_ADDRESS, WETH } from '../../../test/mock';
import { GOLD_RUSH_API_KEY } from '../../datasources/goldRush';
import { TokenHolderRepositoryGoldRush } from './TokenHolderRepositoryGoldRush';

// Skip this test as it requires an https://goldrush.dev API key. Enable it locally when needed
describe.skip('TokenHolderRepositoryGoldRush', () => {
  let tokenHolderRepositoryGoldRush: TokenHolderRepositoryGoldRush;

  beforeAll(() => {
    const container = new Container();
    container
      .bind<TokenHolderRepositoryGoldRush>(TokenHolderRepositoryGoldRush)
      .to(TokenHolderRepositoryGoldRush);
    tokenHolderRepositoryGoldRush = container.get(
      TokenHolderRepositoryGoldRush
    );
    expect(GOLD_RUSH_API_KEY).toBeDefined();
  });

  describe('getTopTokenHolders', () => {
    it('should return the top token holders of WETH', async () => {
      const tokenHolders =
        await tokenHolderRepositoryGoldRush.getTopTokenHolders(
          SupportedChainId.MAINNET,
          WETH
        );

      expect(tokenHolders?.length).toBeGreaterThan(0);
      expect(tokenHolders?.[0].address).toBeDefined();
      expect(Number(tokenHolders?.[0].balance)).toBeGreaterThan(0);
      expect(Number(tokenHolders?.[0].balance)).toBeGreaterThan(
        Number(tokenHolders?.[1].balance)
      );
    }, 100000);

    it('should return null for an unknown token', async () => {
      const tokenHolders =
        await tokenHolderRepositoryGoldRush.getTopTokenHolders(
          SupportedChainId.MAINNET,
          NULL_ADDRESS
        );

      expect(tokenHolders).toBeNull();
    }, 100000);
  });
});
