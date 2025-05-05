import { SupportedChainId } from '@cowprotocol/shared';
import { Container } from 'inversify';
import { NULL_ADDRESS, WETH } from '../../../test/mock';
import { MORALIS_API_KEY } from '../../datasources/moralis';
import { TokenHolderRepositoryMoralis } from './TokenHolderRepositoryMoralis';

describe('TokenHolderRepositoryMoralis', () => {
  let tokenHolderRepositoryMoralis: TokenHolderRepositoryMoralis;

  beforeAll(() => {
    const container = new Container();
    container
      .bind<TokenHolderRepositoryMoralis>(TokenHolderRepositoryMoralis)
      .to(TokenHolderRepositoryMoralis);
    tokenHolderRepositoryMoralis = container.get(TokenHolderRepositoryMoralis);
    expect(MORALIS_API_KEY).toBeDefined();
  });

  describe('getTopTokenHolders', () => {
    it('should return the top token holders of WETH', async () => {
      const tokenHolders =
        await tokenHolderRepositoryMoralis.getTopTokenHolders(
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
        await tokenHolderRepositoryMoralis.getTopTokenHolders(
          SupportedChainId.MAINNET,
          NULL_ADDRESS
        );

      expect(tokenHolders).toBeNull();
    }, 100000);
  });
});
