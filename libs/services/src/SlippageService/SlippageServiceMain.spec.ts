import {
  MAX_SLIPPAGE_BPS,
  MIN_SLIPPAGE_BPS,
  SlippageServiceMain,
} from './SlippageServiceMain';
import { PricePoint, UsdRepository } from '@cowprotocol/repositories';
import { SupportedChainId } from '@cowprotocol/shared';
import ms from 'ms';

const FIVE_MIN = ms('5min');
const FOUR_MIN = ms('4min');
const SIX_MIN = ms('6min');

const getUsdPrice = jest.fn();
const getUsdPrices = jest.fn();

const POINTS_VOLATILITY_ZERO = getPoints([100, 100, 100, 100]);
const POINTS_WITH_HIGH_VOLATILITY = getPoints([100, 110, 120, 130]); // 10% each 5min
const POINTS_WITH_LOW_VOLATILITY = getPoints([
  100.0001, 100.0002, 100.0003, 100.0004,
]); // 0.0001% each 5min

/**
 * Test specification for the SlippageService main implementation
 */
describe('SlippageServiceMain Specification', () => {
  let slippageService: SlippageServiceMain;
  let usdRepositoryMock: UsdRepository;

  const chainId = SupportedChainId.MAINNET;
  const baseTokenAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
  const quoteTokenAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

  beforeEach(() => {
    usdRepositoryMock = {
      getUsdPrice,
      getUsdPrices,
    };

    slippageService = new SlippageServiceMain(usdRepositoryMock);
  });

  describe('should return the maximum slippage if', () => {
    it('prices are not available', async () => {
      // GIVEN: No prices available
      getUsdPrices.mockResolvedValue(null);

      // WHEN: Get slippage
      const result = await slippageService.getSlippageBps({
        chainId,
        baseTokenAddress,
        quoteTokenAddress,
      });

      // THEN: We get the max slippage
      expect(result).toBe(MAX_SLIPPAGE_BPS);
    });

    it('no price points are available', async () => {
      // GIVEN: No prices available
      getUsdPrices.mockResolvedValue([]);

      // WHEN: Get slippage
      const result = await slippageService.getSlippageBps({
        chainId,
        baseTokenAddress,
        quoteTokenAddress,
      });

      // THEN: We get the max slippage
      expect(result).toBe(MAX_SLIPPAGE_BPS);
    });

    it(`one of the tokens is volatile`, async () => {
      getUsdPrices.mockImplementation(
        async (chainId, tokenAddress, interval) => {
          if (tokenAddress === baseTokenAddress) {
            // GIVEN: One token is volatile
            return POINTS_VOLATILITY_ZERO;
          } else {
            // GIVEN: The other token is very volatile
            return POINTS_WITH_HIGH_VOLATILITY;
          }
        }
      );

      // WHEN: Get slippage
      let result = await slippageService.getSlippageBps({
        chainId,
        baseTokenAddress,
        quoteTokenAddress,
      });

      // THEN: We get the maximum slippage
      expect(result).toBe(MAX_SLIPPAGE_BPS);

      // WHEN: Get slippage (with the tokens inverted)
      result = await slippageService.getSlippageBps({
        chainId,
        quoteTokenAddress,
        baseTokenAddress,
      });

      // THEN: We get the maximum slippage too
      expect(result).toBe(MAX_SLIPPAGE_BPS);
    });

    it(`one of the tokens has no prices available`, async () => {
      getUsdPrices.mockImplementation(
        async (chainId, tokenAddress, interval) => {
          if (tokenAddress === baseTokenAddress) {
            // GIVEN: One token is volatile
            return POINTS_VOLATILITY_ZERO;
          } else {
            // GIVEN: The other token is not
            return null;
          }
        }
      );

      // WHEN: Get slippage
      let result = await slippageService.getSlippageBps({
        chainId,
        baseTokenAddress,
        quoteTokenAddress,
      });

      // THEN: We get the maximum slippage
      expect(result).toBe(MAX_SLIPPAGE_BPS);

      // WHEN: Get slippage (with the tokens inverted)
      result = await slippageService.getSlippageBps({
        chainId,
        quoteTokenAddress,
        baseTokenAddress,
      });

      // THEN: We get the maximum slippage too
      expect(result).toBe(MAX_SLIPPAGE_BPS);
    });

    it(`if the prices change a lot`, async () => {
      // GIVEN: The prices have high volatility
      getUsdPrices.mockResolvedValue(POINTS_WITH_HIGH_VOLATILITY);

      // WHEN: Get slippage
      const result = await slippageService.getSlippageBps({
        chainId,
        baseTokenAddress,
        quoteTokenAddress,
      });

      // THEN: We get the maximum slippage
      expect(result).toBe(MAX_SLIPPAGE_BPS);
    });

    it(`if the asset is volatile`, async () => {
      // GIVEN: The prices have high volatility
      getUsdPrices.mockResolvedValue(getPoints([100, 100.02, 100.04, 100.06]));

      // GIVEN: Price is 1 USD
      getUsdPrice.mockResolvedValue(1);

      // WHEN: Get slippage
      const result = await slippageService.getSlippageBps({
        chainId,
        baseTokenAddress,
        quoteTokenAddress,
      });

      // THEN: We get the maximum slippage
      //    AVG = (100 + 100.02 + 100.04 + 100.06)/4 = 100.03
      //    VARIANCE = ((100 - 100.03)**2 + (100.02 - 100.03)**2 + (100.04 - 100.03)**2 + (100.06 - 100.03)**2) / 4 = 0.0005
      //    STDDEV = sqrt(0.0005) = 0.02236067977
      //    Number of points for Fair Settlement = 5min / 5min = 1
      //    Volatility Fair Settlement (USD) = 0.02236067977 * sqrt(1) = 0.02236067977
      //    Volatility Fair Settlement (Token) = 0.02236067977 / 1 = 0.02236067977
      //    Slippage BPS = ceil(0.02236067977 * 10000) = 224
      //    Adjusted Slippage = MAX = 200
      expect(result).toBe(MAX_SLIPPAGE_BPS);
    });
  });

  describe('should return the minimum slippage if', () => {
    it(`if the prices don't change`, async () => {
      // GIVEN: The prices don't change at all
      getUsdPrices.mockResolvedValue(POINTS_VOLATILITY_ZERO);

      // WHEN: Get slippage
      const result = await slippageService.getSlippageBps({
        chainId,
        baseTokenAddress,
        quoteTokenAddress,
      });

      // THEN: We get the minimum slippage
      expect(result).toBe(MIN_SLIPPAGE_BPS);
    });

    it(`if the prices change very little`, async () => {
      // GIVEN: The prices don't change much
      getUsdPrices.mockResolvedValue(POINTS_WITH_LOW_VOLATILITY);

      // WHEN: Get slippage
      const result = await slippageService.getSlippageBps({
        chainId,
        baseTokenAddress,
        quoteTokenAddress,
      });

      // THEN: We get the minimum slippage
      expect(result).toBe(MIN_SLIPPAGE_BPS);
    });
  });

  describe('should return the estimated slippage', () => {
    it(`for normal volatility`, async () => {
      // GIVEN: The prices have high volatility
      getUsdPrices.mockResolvedValue(getPoints([100, 100.01, 100.02, 100.03]));

      // GIVEN: Price is 1 USD
      getUsdPrice.mockResolvedValue(1);

      // WHEN: Get slippage
      const result = await slippageService.getSlippageBps({
        chainId,
        baseTokenAddress,
        quoteTokenAddress,
      });

      // THEN: We get the the calculated slippage
      //    AVG = (100 + 100.01 + 100.02 + 100.03)/4 = 100.015
      //    VARIANCE = ((100 - 100.015)**2 + (100.01 - 100.015)**2 + (100.02 - 100.015)**2 + (100.03 - 100.015)**2) / 4 = 0.000125
      //    STDDEV = sqrt(0.000125) = 0.01118033989
      //    Number of points for Fair Settlement = 5min / 5min = 1
      //    Volatility Fair Settlement (USD) = 0.01118033989 * sqrt(1) = 0.01118033989
      //    Volatility Fair Settlement (Token) = 0.01118033989 / 1 = 0.01118033989
      //    Slippage BPS = ceil(0.01118033989 * 10000) = 112
      //    Adjusted Slippage = 112
      expect(result).toBe(112);
    });

    it(`if token is worth more in USD, the slippage is smaller`, async () => {
      // GIVEN: The prices have high volatility
      getUsdPrices.mockResolvedValue(getPoints([100, 100.01, 100.02, 100.03]));

      // GIVEN: Price is 1.1 USD
      getUsdPrice.mockResolvedValue(1.1);

      // WHEN: Get slippage
      const result = await slippageService.getSlippageBps({
        chainId,
        baseTokenAddress,
        quoteTokenAddress,
      });

      // THEN: We get the the calculated slippage
      //    AVG = (100 + 100.01 + 100.02 + 100.03)/4 = 100.015
      //    VARIANCE = ((100 - 100.015)**2 + (100.01 - 100.015)**2 + (100.02 - 100.015)**2 + (100.03 - 100.015)**2) / 4 = 0.000125
      //    STDDEV = sqrt(0.000125) = 0.01118033989
      //    Number of points for Fair Settlement = 5min / 5min = 1
      //    Volatility Fair Settlement (USD) = 0.01118033989 * sqrt(1) = 0.01118033989
      //    Volatility Fair Settlement (Token) = 0.01118033989 / 1.1 = 0.01016394535
      //    Slippage BPS = ceil(0.01016394535 * 10000) = 102
      //    Adjusted Slippage = 102
      expect(result).toBe(102);
    });

    it(`if token is worth less in USD, the slippage is bigger`, async () => {
      // GIVEN: The prices have high volatility
      getUsdPrices.mockResolvedValue(getPoints([100, 100.01, 100.02, 100.03]));

      // GIVEN: Price is 1.1 USD
      getUsdPrice.mockResolvedValue(0.9);

      // WHEN: Get slippage
      const result = await slippageService.getSlippageBps({
        chainId,
        baseTokenAddress,
        quoteTokenAddress,
      });

      // THEN: We get the the calculated slippage
      //    AVG = (100 + 100.01 + 100.02 + 100.03)/4 = 100.015
      //    VARIANCE = ((100 - 100.015)**2 + (100.01 - 100.015)**2 + (100.02 - 100.015)**2 + (100.03 - 100.015)**2) / 4 = 0.000125
      //    STDDEV = sqrt(0.000125) = 0.01118033989
      //    Number of points for Fair Settlement = 5min / 5min = 1
      //    Volatility Fair Settlement (USD) = 0.01118033989 * sqrt(1) = 0.01118033989
      //    Volatility Fair Settlement (Token) = 0.01118033989 / 0.9 = 0.01242259988
      //    Slippage BPS = ceil(0.01242259988 * 10000) = 125
      //    Adjusted Slippage = 125
      expect(result).toBe(125);
    });

    it(`price points further away in time, make the slippage smaller`, async () => {
      // GIVEN: If the points are 6min apart (instead of 5min)
      getUsdPrices.mockResolvedValue(
        getPoints([100, 100.01, 100.02, 100.03], SIX_MIN)
      );

      // GIVEN: Price is 1 USD
      getUsdPrice.mockResolvedValue(1);

      // WHEN: Get slippage
      const result = await slippageService.getSlippageBps({
        chainId,
        baseTokenAddress,
        quoteTokenAddress,
      });

      // THEN: We get the calculated slippage
      //    AVG = (100 + 100.01 + 100.02 + 100.03)/4 = 100.015
      //    VARIANCE = ((100 - 100.015)**2 + (100.01 - 100.015)**2 + (100.02 - 100.015)**2 + (100.03 - 100.015)**2) / 4 = 0.000125
      //    STDDEV = sqrt(0.000125) = 0.01118033989
      //    Number of points for Fair Settlement = 5min / 6min = 0.8333333333
      //    Volatility Fair Settlement (USD) = 0.01118033989 * sqrt(0.8333333333) = 0.01020620726
      //    Volatility Fair Settlement (Token) = 0.01020620726 / 1 = 0.01020620726
      //    Slippage BPS = ceil(0.01020620726 * 10000) = 103
      //    Adjusted Slippage = 103
      expect(result).toBe(103); // 103 is less than 112 (same prices, but 6min apart instead of 5min)
    });

    it(`price points closer in time, increase volatility`, async () => {
      // GIVEN: If the points are 4min apart (instead of 5min)
      getUsdPrices.mockResolvedValue(
        getPoints([100, 100.01, 100.02, 100.03], FOUR_MIN)
      );

      // GIVEN: Price is 1 USD
      getUsdPrice.mockResolvedValue(1);

      // WHEN: Get slippage
      const result = await slippageService.getSlippageBps({
        chainId,
        baseTokenAddress,
        quoteTokenAddress,
      });

      // THEN: We get the minimum slippage
      //    AVG = (100 + 100.01 + 100.02 + 100.03)/4 = 100.015
      //    VARIANCE = ((100 - 100.015)**2 + (100.01 - 100.015)**2 + (100.02 - 100.015)**2 + (100.03 - 100.015)**2) / 4 = 0.000125
      //    STDDEV = sqrt(0.000125) = 0.01118033989
      //    Number of points for Fair Settlement = 5min / 4min = 1.25
      //    Volatility Fair Settlement (USD) = 0.01118033989 * sqrt(1.25) = 0.0125
      //    Volatility Fair Settlement (Token) = 0.0125 / 1 = 0.0125
      //    Slippage BPS = ceil(0.0125 * 10000) = 125
      //    Adjusted Slippage = 125
      expect(result).toBe(125); // 125 is more than 112 (same prices, but 4min apart instead of 5min)
    });
  });

  describe('when tokens have different volatility', () => {
    it(`should return the worst of the two tokens`, async () => {
      // GIVEN: The prices have high volatility
      getUsdPrices.mockResolvedValue(getPoints([100, 100.01, 100.02, 100.03]));

      getUsdPrice.mockImplementation(async (chainId, tokenAddress) => {
        if (tokenAddress === quoteTokenAddress) {
          // GIVEN: Base token is 1 USD
          return 1;
        } else {
          // GIVEN: Quote token is 1 USD
          return 0.9;
        }
      });

      // WHEN: Get slippage
      const result = await slippageService.getSlippageBps({
        chainId,
        baseTokenAddress,
        quoteTokenAddress,
      });

      // THEN: We get the worst slippage of the two tokens
      //    AVG = (100 + 100.01 + 100.02 + 100.03)/4 = 100.015
      //    VARIANCE = ((100 - 100.015)**2 + (100.01 - 100.015)**2 + (100.02 - 100.015)**2 + (100.03 - 100.015)**2) / 4 = 0.000125
      //    STDDEV = sqrt(0.000125) = 0.01118033989
      //    Number of points for Fair Settlement = 5min / 5min = 1
      //    Volatility Fair Settlement (USD) = 0.01118033989 * sqrt(1) = 0.01118033989

      //    Volatility Fair Settlement for quote (Token) = 0.01118033989 / 1 = 0.01118033989
      //    Slippage BPS for quote = ceil(0.01118033989 * 10000) = 112
      //    Adjusted Slippage for quote = 112

      //    Volatility Fair Settlement for quote (Token) = 0.01118033989 / 0.9 = 0.01242259988
      //    Slippage BPS for quote = ceil(0.01242259988 * 10000) = 125
      //    Adjusted Slippage for quote = 125
      expect(result).toBe(125);

      // WHEN: Get slippage (inverting the tokens)
      const resultTokensInverted = await slippageService.getSlippageBps({
        chainId,
        quoteTokenAddress,
        baseTokenAddress,
      });

      // THEN: The result should be the same (worst of the two)
      expect(resultTokensInverted).toBe(125);
    });

    it(`should return the maximum volatility if we can't estimate the USD price of a token`, async () => {
      // GIVEN: The prices have high volatility
      getUsdPrices.mockResolvedValue(getPoints([100, 100.01, 100.02, 100.03]));

      getUsdPrice.mockImplementation(async (chainId, tokenAddress) => {
        if (tokenAddress === quoteTokenAddress) {
          // GIVEN: Base token is 1 USD
          return 1;
        } else {
          // GIVEN: Quote token is not available
          return null;
        }
      });

      // WHEN: Get slippage
      const result = await slippageService.getSlippageBps({
        chainId,
        baseTokenAddress,
        quoteTokenAddress,
      });

      // THEN: We get the minimum slippage
      expect(result).toBe(MAX_SLIPPAGE_BPS);

      // WHEN: Get slippage (inverting the tokens)
      const resultInverted = await slippageService.getSlippageBps({
        chainId,
        baseTokenAddress,
        quoteTokenAddress,
      });

      // THEN: The result should be the same (worst of the two)
      expect(resultInverted).toBe(MAX_SLIPPAGE_BPS);
    });
  });
});

function getPoints(
  prices: number[],
  timeBetweenPoints = FIVE_MIN
): PricePoint[] {
  const now = Date.now();
  return prices.map((price, i) => ({
    date: new Date(now + timeBetweenPoints * i),
    price,
    volume: 1,
  }));
}
