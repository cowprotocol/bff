import { Container } from 'inversify';
import { UsdRepositoryCoingecko } from './UsdRepositoryCoingecko';
import { SupportedChainId } from '@cowprotocol/shared';
import { WETH, NULL_ADDRESS } from '../../test/mock';
import ms from 'ms';

const FIVE_MINUTES = ms('5m');
const ONE_HOUR = ms('1h');
const ONE_DAY = ms('1d');
const BUFFER_ERROR_TOLERANCE = 1.5; // 50% error tolerance

describe('UsdRepositoryCoingecko', () => {
  let usdRepositoryCoingecko: UsdRepositoryCoingecko;

  beforeAll(() => {
    const container = new Container();
    container
      .bind<UsdRepositoryCoingecko>(UsdRepositoryCoingecko)
      .to(UsdRepositoryCoingecko);
    usdRepositoryCoingecko = container.get(UsdRepositoryCoingecko);
  });

  describe('getUsdPrice', () => {
    it('should return the current price of WETH', async () => {
      const price = await usdRepositoryCoingecko.getUsdPrice(
        SupportedChainId.MAINNET,
        WETH
      );

      expect(price).toBeGreaterThan(0);
    });

    it('should return NULL for an unknown token', async () => {
      const price = await usdRepositoryCoingecko.getUsdPrice(
        SupportedChainId.MAINNET,
        NULL_ADDRESS
      );

      // Price should be null (no data available)
      expect(price).toBeNull();
    });
  });

  describe('getUsdPrices', () => {
    it('[5m] should return ~288 prices of WETH (~5min apart)', async () => {
      const prices = await usdRepositoryCoingecko.getUsdPrices(
        SupportedChainId.MAINNET,
        WETH,
        '5m'
      );
      if (prices === null) {
        throw new Error('Prices should not be null');
      }

      // We expect around 288 prices. We just assert we receive between 250 and 300 prices
      expect(prices.length).toBeGreaterThan(250);
      expect(prices.length).toBeLessThan(300);

      for (let i = 1; i < prices.length; i++) {
        const price = prices[i];
        const previousPrice = prices[i - 1];

        // Check the time difference between the two prices is around 5 minutes
        // console.log('Price', price, previousPrice);
        expect(
          Math.abs(
            price.date.getTime() - previousPrice.date.getTime() - FIVE_MINUTES
          )
        ).toBeLessThanOrEqual(FIVE_MINUTES * BUFFER_ERROR_TOLERANCE); // 5 min of error tolerance (we don't need to be super precise, but we also want to assert the points are kind of 5min apart)
        expect(price.price).toBeGreaterThan(0);
      }
    });

    it('[5m] should return NULL for an unknown token', async () => {
      const prices = await usdRepositoryCoingecko.getUsdPrices(
        SupportedChainId.MAINNET,
        NULL_ADDRESS,
        '5m'
      );

      // Prices should be null (no data available)
      expect(prices).toBeNull();
    });

    it('[hourly] should return ~120 prices of WETH (~60min apart)', async () => {
      const prices = await usdRepositoryCoingecko.getUsdPrices(
        SupportedChainId.MAINNET,
        WETH,
        'hourly'
      );

      if (prices === null) {
        throw new Error('Prices should not be null');
      }

      // We expect around 120 prices. We just assert we receive between 100 and 150 prices
      expect(prices.length).toBeGreaterThan(100);
      expect(prices.length).toBeLessThan(150);

      for (let i = 1; i < prices.length; i++) {
        const price = prices[i];
        const previousPrice = prices[i - 1];

        // Check the time difference between the two prices is around 5 minutes
        expect(
          Math.abs(
            price.date.getTime() - previousPrice.date.getTime() - ONE_HOUR
          )
        ).toBeLessThanOrEqual(ONE_HOUR * BUFFER_ERROR_TOLERANCE); // 1 hour of error tolerance (we don't need to be super precise, but we also want to assert the points are kind of 1 hour apart)
        expect(price.price).toBeGreaterThan(0);
      }
    });

    it('[daily] should return ~90 prices of WETH (~24h apart)', async () => {
      const prices = await usdRepositoryCoingecko.getUsdPrices(
        SupportedChainId.MAINNET,
        WETH,
        'daily'
      );
      if (prices === null) {
        throw new Error('Prices should not be null');
      }

      // We expect around ~90 prices. We just assert we receive between 80 and 100 prices
      expect(prices.length).toBeGreaterThan(80);
      expect(prices.length).toBeLessThan(100);

      for (let i = 1; i < prices.length; i++) {
        const price = prices[i];
        const previousPrice = prices[i - 1];

        // Check the time difference between the two prices is around 5 minutes
        expect(
          Math.abs(
            price.date.getTime() - previousPrice.date.getTime() - ONE_DAY
          )
        ).toBeLessThanOrEqual(ONE_DAY * BUFFER_ERROR_TOLERANCE); // 1 day of error tolerance (we don't need to be super precise, but we also want to assert the points are kind of 1 day apart)
        expect(price.price).toBeGreaterThan(0);
      }
    });
  });
});
