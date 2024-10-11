import { Container } from 'inversify';
import { TokenHolderRepositoryEthplorer } from './TokenHolderRepositoryEthplorer';
import { SupportedChainId } from '@cowprotocol/shared';
import { WETH, NULL_ADDRESS } from '../../test/mock';
import { ETHPLORER_API_KEY } from '../datasources/ethplorer';

describe('TokenHolderRepositoryEthplorer', () => {
  let tokenHolderRepositoryEthplorer: TokenHolderRepositoryEthplorer;

  beforeAll(() => {
    const container = new Container();
    container
      .bind<TokenHolderRepositoryEthplorer>(TokenHolderRepositoryEthplorer)
      .to(TokenHolderRepositoryEthplorer);
    tokenHolderRepositoryEthplorer = container.get(
      TokenHolderRepositoryEthplorer
    );
    expect(ETHPLORER_API_KEY).toBeDefined();
  });

  describe('getTopTokenHolders', () => {
    it('should return the top token holders of WETH', async () => {
      const tokenHolders =
        await tokenHolderRepositoryEthplorer.getTopTokenHolders(
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
        await tokenHolderRepositoryEthplorer.getTopTokenHolders(
          SupportedChainId.MAINNET,
          NULL_ADDRESS
        );

      expect(tokenHolders).toBeNull();
    }, 100000);

    it('should return null for gnosis chain', async () => {
      const tokenHolders =
        await tokenHolderRepositoryEthplorer.getTopTokenHolders(
          SupportedChainId.GNOSIS_CHAIN,
          WETH
        );

      expect(tokenHolders).toBeNull();
    }, 100000);

    it('should return null for arbitrum one', async () => {
      const tokenHolders =
        await tokenHolderRepositoryEthplorer.getTopTokenHolders(
          SupportedChainId.ARBITRUM_ONE,
          WETH
        );

      expect(tokenHolders).toBeNull();
    }, 100000);
  });
});
