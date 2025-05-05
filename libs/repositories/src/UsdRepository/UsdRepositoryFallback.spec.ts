import { SupportedChainId } from '@cowprotocol/shared';
import { WETH } from '../../test/mock';
import { PricePoint, UsdRepository } from './UsdRepository';
import { UsdRepositoryFallback } from './UsdRepositoryFallback';
const mockDate = new Date('2024-01-01T00:00:00Z');
class UsdRepositoryMock_1_1 implements UsdRepository {
  async getUsdPrice() {
    return 1;
  }

  async getUsdPrices(): Promise<PricePoint[] | null> {
    return [{ date: mockDate, price: 1, volume: 1 }];
  }
}

class UsdRepositoryMock_2_2 implements UsdRepository {
  async getUsdPrice(): Promise<number | null> {
    return 2;
  }

  async getUsdPrices(): Promise<PricePoint[] | null> {
    return [{ date: mockDate, price: 2, volume: 2 }];
  }
}

class UsdRepositoryMock_null_3 implements UsdRepository {
  async getUsdPrice() {
    return null;
  }

  async getUsdPrices(): Promise<PricePoint[] | null> {
    return [{ date: mockDate, price: 3, volume: 3 }];
  }
}

class UsdRepositoryMock_3_null implements UsdRepository {
  async getUsdPrice() {
    return 3;
  }

  async getUsdPrices(): Promise<PricePoint[] | null> {
    return null;
  }
}

class UsdRepositoryMock_null_null implements UsdRepository {
  async getUsdPrice() {
    return null;
  }

  async getUsdPrices(): Promise<PricePoint[] | null> {
    return null;
  }
}

const CHAIN_ID = SupportedChainId.MAINNET.toString();

const PARAMS_PRICE = [CHAIN_ID, WETH] as const;
const PARAMS_PRICES = [CHAIN_ID, WETH, '5m'] as const;

const usdRepositoryMock_1_1 = new UsdRepositoryMock_1_1();
const usdRepositoryMock_2_2 = new UsdRepositoryMock_2_2();
const usdRepositoryMock_null_3 = new UsdRepositoryMock_null_3();
const usdRepositoryMock_3_null = new UsdRepositoryMock_3_null();
const usdRepositoryMock_null_null = new UsdRepositoryMock_null_null();

describe('UsdRepositoryCoingecko', () => {
  describe('getUsdPrice', () => {
    it('Returns first repo price when is not null', async () => {
      let usdRepositoryFallback = new UsdRepositoryFallback([
        usdRepositoryMock_1_1,
        usdRepositoryMock_2_2,
      ]);

      let price = await usdRepositoryFallback.getUsdPrice(...PARAMS_PRICE);

      expect(price).toEqual(1);

      usdRepositoryFallback = new UsdRepositoryFallback([
        usdRepositoryMock_2_2,
        usdRepositoryMock_1_1,
      ]);

      price = await usdRepositoryFallback.getUsdPrice(...PARAMS_PRICE);

      expect(price).toEqual(2);

      usdRepositoryFallback = new UsdRepositoryFallback([
        usdRepositoryMock_1_1,
        usdRepositoryMock_null_3,
      ]);

      price = await usdRepositoryFallback.getUsdPrice(...PARAMS_PRICE);
      expect(price).toEqual(1);
    });

    it('Returns second repo price when null', async () => {
      const usdRepositoryFallback = new UsdRepositoryFallback([
        usdRepositoryMock_null_3,
        usdRepositoryMock_1_1,
      ]);

      const price = await usdRepositoryFallback.getUsdPrice(...PARAMS_PRICE);
      expect(price).toEqual(1);
    });

    it('Returns null when configured with no repositories', async () => {
      const usdRepositoryFallback = new UsdRepositoryFallback([]);
      const price = await usdRepositoryFallback.getUsdPrice(...PARAMS_PRICE);
      expect(price).toEqual(null);
    });

    it('Returns null when no repo return a price', async () => {
      const usdRepositoryFallback = new UsdRepositoryFallback([
        usdRepositoryMock_null_3,
        usdRepositoryMock_null_null,
      ]);
      const price = await usdRepositoryFallback.getUsdPrice(...PARAMS_PRICE);
      expect(price).toEqual(null);
    });
  });

  describe('getUsdPrices', () => {
    it('Returns first repo prices when is not null', async () => {
      let usdRepositoryFallback = new UsdRepositoryFallback([
        usdRepositoryMock_1_1,
        usdRepositoryMock_2_2,
      ]);

      let price = await usdRepositoryFallback.getUsdPrices(...PARAMS_PRICES);
      expect(price).toEqual([{ date: mockDate, price: 1, volume: 1 }]);

      usdRepositoryFallback = new UsdRepositoryFallback([
        usdRepositoryMock_2_2,
        usdRepositoryMock_1_1,
      ]);

      price = await usdRepositoryFallback.getUsdPrices(...PARAMS_PRICES);

      expect(price).toEqual([{ date: mockDate, price: 2, volume: 2 }]);

      usdRepositoryFallback = new UsdRepositoryFallback([
        usdRepositoryMock_1_1,
        usdRepositoryMock_null_3,
      ]);

      price = await usdRepositoryFallback.getUsdPrices(...PARAMS_PRICES);
      expect(price).toEqual([{ date: mockDate, price: 1, volume: 1 }]);
    });

    it('Returns second repo prices when null', async () => {
      const usdRepositoryFallback = new UsdRepositoryFallback([
        usdRepositoryMock_null_null,
        usdRepositoryMock_1_1,
      ]);

      const price = await usdRepositoryFallback.getUsdPrices(...PARAMS_PRICES);
      expect(price).toEqual([{ date: mockDate, price: 1, volume: 1 }]);
    });

    it('Returns null when configured with no repositories', async () => {
      // When no repo is provided, it returns null
      const usdRepositoryFallback = new UsdRepositoryFallback([]);
      const price = await usdRepositoryFallback.getUsdPrices(...PARAMS_PRICES);
      expect(price).toEqual(null);
    });

    it('Returns null when no repo return prices', async () => {
      const usdRepositoryFallback = new UsdRepositoryFallback([
        usdRepositoryMock_3_null,
        usdRepositoryMock_null_null,
      ]);
      const price = await usdRepositoryFallback.getUsdPrices(...PARAMS_PRICES);
      expect(price).toEqual(null);
    });
  });
});
