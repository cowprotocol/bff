import { SupportedChainId } from '@cowprotocol/shared';
import { TokenHolderRepository } from './TokenHolderRepository';
import { TokenHolderRepositoryFallback } from './TokenHolderRepositoryFallback';
import { NULL_ADDRESS, WETH } from '../../../test/mock';

const firstRepositoryResult = [
  {
    address: NULL_ADDRESS,
    balance: '1',
  },
];

const secondRepositoryResult = [
  {
    address: NULL_ADDRESS,
    balance: '2',
  },
];

class TokenHolderRepositoryMock_1 implements TokenHolderRepository {
  async getTopTokenHolders() {
    return firstRepositoryResult;
  }
}

class TokenHolderRepositoryMock_2 implements TokenHolderRepository {
  async getTopTokenHolders() {
    return secondRepositoryResult;
  }
}

class TokenHolderRepositoryMock_null implements TokenHolderRepository {
  async getTopTokenHolders() {
    return null;
  }
}

const PARAMS_PRICE = [SupportedChainId.MAINNET, WETH] as const;

const tokenHoldersRepositoryMock_1 = new TokenHolderRepositoryMock_1();
const tokenHoldersRepositoryMock_2 = new TokenHolderRepositoryMock_2();
const tokenHoldersRepositoryMock_null = new TokenHolderRepositoryMock_null();

describe('TokenHolderRepositoryCoingecko', () => {
  describe('getTopTokenHolders', () => {
    it('Returns first repo price when is not null', async () => {
      let tokenHoldersRepositoryFallback = new TokenHolderRepositoryFallback([
        tokenHoldersRepositoryMock_1,
        tokenHoldersRepositoryMock_2,
      ]);

      let tokenHolders =
        await tokenHoldersRepositoryFallback.getTopTokenHolders(
          ...PARAMS_PRICE
        );

      expect(tokenHolders).toStrictEqual(firstRepositoryResult);

      tokenHoldersRepositoryFallback = new TokenHolderRepositoryFallback([
        tokenHoldersRepositoryMock_2,
        tokenHoldersRepositoryMock_1,
      ]);

      tokenHolders = await tokenHoldersRepositoryFallback.getTopTokenHolders(
        ...PARAMS_PRICE
      );

      expect(tokenHolders).toStrictEqual(secondRepositoryResult);

      tokenHoldersRepositoryFallback = new TokenHolderRepositoryFallback([
        tokenHoldersRepositoryMock_1,
        tokenHoldersRepositoryMock_null,
      ]);

      tokenHolders = await tokenHoldersRepositoryFallback.getTopTokenHolders(
        ...PARAMS_PRICE
      );
      expect(tokenHolders).toStrictEqual(firstRepositoryResult);
    });

    it('Returns second repo holders when null', async () => {
      const tokenHoldersRepositoryFallback = new TokenHolderRepositoryFallback([
        tokenHoldersRepositoryMock_null,
        tokenHoldersRepositoryMock_1,
      ]);

      const tokenHolders =
        await tokenHoldersRepositoryFallback.getTopTokenHolders(
          ...PARAMS_PRICE
        );
      expect(tokenHolders).toStrictEqual(firstRepositoryResult);
    });

    it('Returns null when configured with no repositories', async () => {
      const tokenHoldersRepositoryFallback = new TokenHolderRepositoryFallback(
        []
      );
      const tokenHolders =
        await tokenHoldersRepositoryFallback.getTopTokenHolders(
          ...PARAMS_PRICE
        );
      expect(tokenHolders).toEqual(null);
    });

    it('Returns null when no repo return holders', async () => {
      const tokenHoldersRepositoryFallback = new TokenHolderRepositoryFallback([
        tokenHoldersRepositoryMock_null,
        tokenHoldersRepositoryMock_null,
      ]);
      const price = await tokenHoldersRepositoryFallback.getTopTokenHolders(
        ...PARAMS_PRICE
      );
      expect(price).toEqual(null);
    });
  });
});
