import { Container } from 'inversify';
import { UsdRepositoryCoingecko } from './UsdRepositoryCoingecko';
import { SupportedChainId } from '../types';
import { assert } from 'console';

const FIVE_MINUTES = 5 * 60 * 1000;
const ERROR_TOLERANCE = 5 * 60 * 1000; // 5min of error tolerance (we don't need to be super precise, but we want to asset the points are not 1h apart)
const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';

describe('UsdRepositoryCoingecko', () => {
  let usdRepositoryCoingecko: UsdRepositoryCoingecko;

  beforeAll(() => {
    const container = new Container();
    container
      .bind<UsdRepositoryCoingecko>(UsdRepositoryCoingecko)
      .to(UsdRepositoryCoingecko);
    usdRepositoryCoingecko = container.get(UsdRepositoryCoingecko);
  });

  it('should return price 288 prices of WETH (~5min apart)', async () => {
    const prices = await usdRepositoryCoingecko.getUsdPrices(
      SupportedChainId.MAINNET,
      WETH,
      '5m'
    );

    expect(prices.length).toEqual(288);

    for (let i = 1; i < prices.length; i++) {
      const price = prices[i];
      const previousPrice = prices[i - 1];

      // Check the time difference between the two prices is around 5 minutes
      // console.log('Price', price, previousPrice);
      expect(
        Math.abs(
          price.date.getTime() - previousPrice.date.getTime() - FIVE_MINUTES
        )
      ).toBeLessThanOrEqual(ERROR_TOLERANCE);
    }
  });
});
