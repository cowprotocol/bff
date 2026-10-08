import { SupportedChainId } from '@cowprotocol/cow-sdk'
import { PricePoint, UsdRepository } from '@cowprotocol/repositories'
import ms from 'ms'
import { MIN_SLIPPAGE_BPS, SlippageServiceMain } from './SlippageServiceMain'

const FIVE_MIN = ms('5min')
const TEN_MIN = ms('10min')
const FIFTEEN_MIN = ms('15min')

const getUsdPrice = jest.fn()
const getUsdPrices = jest.fn()

const POINTS_VOLATILITY_ZERO = getPoints([1, 1, 1, 1])
const POINTS_WITH_HIGH_VOLATILITY = getPoints([100, 110, 120, 130]) // 10% each 5min
const POINTS_WITH_LOW_VOLATILITY = getPoints([100.0001, 100.0002, 100.0003, 100.0004]) // 0.0001% each 5min

/**
 * Test specification for the SlippageService main implementation
 */
describe('SlippageServiceMain Specification', () => {
  let slippageService: SlippageServiceMain
  let usdRepositoryMock: UsdRepository

  const chainId = SupportedChainId.MAINNET
  const baseTokenAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
  const quoteTokenAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'

  beforeEach(() => {
    usdRepositoryMock = {
      name: 'Mock',
      getUsdPrice,
      getUsdPrices,
    }

    slippageService = new SlippageServiceMain(usdRepositoryMock)

    getUsdPrice.mockImplementation(getUsdPriceMockFn(baseTokenAddress, 1, 10))
  })

  describe('should return the 0 slippage if', () => {
    it('prices are not available', async () => {
      // GIVEN: No prices available
      getUsdPrices.mockResolvedValue(null)

      // WHEN: Get slippage
      const result = await slippageService.getSlippageBps({
        chainId,
        baseTokenAddress,
        quoteTokenAddress,
      })

      // THEN: We get the max slippage
      expect(result).toBe(0)
    })

    it('no price points are available', async () => {
      // GIVEN: No prices available
      getUsdPrices.mockResolvedValue([])

      // WHEN: Get slippage
      const result = await slippageService.getSlippageBps({
        chainId,
        baseTokenAddress,
        quoteTokenAddress,
      })

      // THEN: We get the max slippage
      expect(result).toBe(0)
    })

    it(`one of the tokens is volatile`, async () => {
      getUsdPrices.mockImplementation(
        getUsdPricesMockFn(baseTokenAddress, POINTS_VOLATILITY_ZERO, POINTS_WITH_HIGH_VOLATILITY)
      )

      // WHEN: Get slippage
      let result = await slippageService.getSlippageBps({
        chainId,
        baseTokenAddress,
        quoteTokenAddress,
      })

      // THEN: We price the pair's own changes: ~9%, ~8.7%, ~8% per reading
      expect(result).toBe(871)

      // WHEN: Get slippage (with the tokens inverted)
      result = await slippageService.getSlippageBps({
        chainId,
        quoteTokenAddress: baseTokenAddress,
        baseTokenAddress: quoteTokenAddress,
      })

      // THEN: The same, inverted. Relative volatility is symmetric: A against B is as volatile as
      //       B against A. The old estimator gave 87 one way and 11181 the other.
      expect(result).toBe(871)
    })

    it(`one of the tokens has no prices available`, async () => {
      getUsdPrices.mockImplementation(getUsdPricesMockFn(baseTokenAddress, POINTS_VOLATILITY_ZERO, null))

      // WHEN: Get slippage
      let result = await slippageService.getSlippageBps({
        chainId,
        baseTokenAddress,
        quoteTokenAddress,
      })

      // THEN: We get the maximum slippage
      expect(result).toBe(0)

      // WHEN: Get slippage (with the tokens inverted)
      result = await slippageService.getSlippageBps({
        chainId,
        quoteTokenAddress: baseTokenAddress,
        baseTokenAddress: quoteTokenAddress,
      })

      // THEN: We get the maximum slippage too
      expect(result).toBe(0)
    })

    it(`if the prices change a lot`, async () => {
      // GIVEN: The prices have high volatility
      getUsdPrices.mockImplementation(
        getUsdPricesMockFn(baseTokenAddress, POINTS_WITH_HIGH_VOLATILITY, POINTS_VOLATILITY_ZERO)
      )

      // WHEN: Get slippage
      const result = await slippageService.getSlippageBps({
        chainId,
        baseTokenAddress,
        quoteTokenAddress,
      })

      // THEN: Same pair as above with the legs swapped, so the same answer
      expect(result).toBe(871)
    })

    it(`if there are no data points matching the date`, async () => {
      // GIVEN: No data points matching the date
      getUsdPrices.mockImplementation(
        getUsdPricesMockFn(
          baseTokenAddress,
          POINTS_VOLATILITY_ZERO,
          getPoints([1, 2, 2, 3], undefined, Date.now() - ms('1h'))
        )
      )

      // WHEN: Get slippage
      const result = await slippageService.getSlippageBps({
        chainId,
        baseTokenAddress,
        quoteTokenAddress,
      })

      // THEN: Dates don't align, so we fall back to the worst single token. The quote token moves
      //       ln(2), 0 and ln(1.5) between readings:
      //       AVERAGE CHANGE = 0.366, STDDEV = 0.284, 3 standard deviations = 0.853 -> 8531 bps
      expect(result).toBe(8531)
    })

    it(`the asset barely moves between readings`, async () => {
      // GIVEN: Prices that step 0.02% at a time
      getUsdPrices.mockImplementation(
        getUsdPricesMockFn(baseTokenAddress, getPoints([100, 100.02, 100.04, 100.06]), POINTS_VOLATILITY_ZERO)
      )

      // WHEN: Get slippage
      const result = await slippageService.getSlippageBps({
        chainId,
        baseTokenAddress,
        quoteTokenAddress,
      })

      // THEN: 0.02% steps is calm, so the floor is what we end up serving. The old estimator read
      //       the same series as 2237 bps because it divided a 24h spread by a $1 token price.
      expect(result).toBe(MIN_SLIPPAGE_BPS)
    })
  })

  describe('should return the minimum slippage if', () => {
    it(`if the prices don't change`, async () => {
      // GIVEN: The prices don't change at all
      getUsdPrices.mockResolvedValue(POINTS_VOLATILITY_ZERO)

      // WHEN: Get slippage
      const result = await slippageService.getSlippageBps({
        chainId,
        baseTokenAddress,
        quoteTokenAddress,
      })

      // THEN: Measured and calm, which is not the same as unknown, so it gets the floor
      expect(result).toBe(MIN_SLIPPAGE_BPS)
    })

    it(`if the prices change very little`, async () => {
      // GIVEN: The prices don't change much
      getUsdPrices.mockImplementation(
        getUsdPricesMockFn(baseTokenAddress, POINTS_WITH_LOW_VOLATILITY, POINTS_VOLATILITY_ZERO)
      )

      // WHEN: Get slippage
      const result = await slippageService.getSlippageBps({
        chainId,
        baseTokenAddress,
        quoteTokenAddress,
      })

      // THEN: Still the floor
      expect(result).toBe(MIN_SLIPPAGE_BPS)
    })
  })

  describe('should return the estimated slippage', () => {
    it(`for normal volatility`, async () => {
      // GIVEN: The prices have high volatility
      getUsdPrices.mockImplementation(
        getUsdPricesMockFn(baseTokenAddress, getPoints([100, 100.01, 100.02, 100.03]), POINTS_VOLATILITY_ZERO)
      )

      getUsdPrice.mockImplementation(getUsdPriceMockFn(baseTokenAddress, 100, 1))

      // WHEN: Get slippage
      const result = await slippageService.getSlippageBps({
        chainId,
        baseTokenAddress,
        quoteTokenAddress,
      })

      // THEN: We get the the calculated slippage
      //    Relative prices = [100/1, 100.01/1, 100.02/1, 100.03/1]
      //    Relative price = 100/1 => 100
      //    AVG = (100 + 100.01 + 100.02 + 100.03)/4 = 100.015
      //    VARIANCE = ((100 - 100.015)**2 + (100.01 - 100.015)**2 + (100.02 - 100.015)**2 + (100.03 - 100.015)**2) / 4 = 0.000125
      //    STDDEV = sqrt(0.000125) = 0.01118033989
      //    Number of points for Fair Settlement = 5min / 5min = 1
      //    Volatility Fair Settlement (USD) = 0.01118033989 * sqrt(1) = 0.01118033989
      //    Volatility Fair Settlement (Token) = 0.01118033989 / 100 = 0.1118033989
      //    Slippage BPS = ceil(0.1118033989 * 10000) = 112
      //    Adjusted Slippage = 112
      expect(result).toBe(2)
    })

    it(`does not depend on what the tokens are worth in USD`, async () => {
      // GIVEN: The same price history, priced at wildly different USD values
      getUsdPrices.mockImplementation(
        getUsdPricesMockFn(baseTokenAddress, getPoints([100, 101, 100, 101]), POINTS_VOLATILITY_ZERO)
      )

      getUsdPrice.mockImplementation(getUsdPriceMockFn(baseTokenAddress, 0.9, 100))
      const cheapToken = await slippageService.getSlippageBps({ chainId, baseTokenAddress, quoteTokenAddress })

      getUsdPrice.mockImplementation(getUsdPriceMockFn(baseTokenAddress, 1000, 100))
      const expensiveToken = await slippageService.getSlippageBps({ chainId, baseTokenAddress, quoteTokenAddress })

      // THEN: Volatility is a fraction of the price, so the price itself cancels out. The old
      //       estimator divided an absolute spread by the spot price and so answered 12423 for the
      //       cheap token and 10164 for the dearer one, off the very same price history.
      expect(cheapToken).toBe(expensiveToken)
    })

    it(`scales with how far apart the readings are`, async () => {
      const fixedStartTime = new Date('2024-01-01T00:00:00Z').getTime()
      const prices = [100, 101, 100, 101, 100, 101]

      const slippageAtInterval = async (interval: number) => {
        getUsdPrices.mockImplementation(
          getUsdPricesMockFn(
            baseTokenAddress,
            getPoints(prices, interval, fixedStartTime),
            getPoints([10, 10, 10, 10, 10, 10], interval, fixedStartTime)
          )
        )
        getUsdPrice.mockImplementation(getUsdPriceMockFn(baseTokenAddress, 1, 10))

        return slippageService.getSlippageBps({ chainId, baseTokenAddress, quoteTokenAddress })
      }

      // GIVEN: The same 1% steps, sampled 5, 10 and 15 minutes apart.
      //        Intervals have to be multiples of 5min: getVolatilityForPair snaps both legs onto
      //        5 minute buckets, so anything finer collides and silently drops points.
      const everyFiveMin = await slippageAtInterval(FIVE_MIN)
      const everyTenMin = await slippageAtInterval(TEN_MIN)
      const everyFifteenMin = await slippageAtInterval(FIFTEEN_MIN)

      // THEN: A 1% step taken every 5 minutes is more dangerous over a 5 minute settlement than the
      //       same step taken every 15, because it happens three times as often.
      //       sqrt(5/10) = 0.707, sqrt(5/15) = 0.577.
      expect(everyFiveMin).toBeGreaterThan(everyTenMin)
      expect(everyTenMin).toBeGreaterThan(everyFifteenMin)
    })
  })

  describe('when tokens have the exact same volatility', () => {
    it(`when usd prices are different`, async () => {
      // GIVEN: The prices have high volatility
      getUsdPrices.mockResolvedValue(getPoints([100, 100.01, 100.02, 100.03]))

      getUsdPrice.mockImplementation(async (chainId, tokenAddress) => {
        if (tokenAddress === quoteTokenAddress) {
          // GIVEN: Base token is 1 USD
          return 1
        } else {
          // GIVEN: Quote token is 1 USD
          return 0.9
        }
      })

      // WHEN: Get slippage
      const result = await slippageService.getSlippageBps({
        chainId,
        baseTokenAddress,
        quoteTokenAddress,
      })

      // THEN: We get the worst slippage of the two tokens
      //    AVG = (100 + 100.01 + 100.02 + 100.03)/4 = 100.015
      //    VARIANCE = ((100 - 100.015)**2 + (100.01 - 100.015)**2 + (100.02 - 100.015)**2 + (100.03 - 100.015)**2) / 4 = 0.000125
      //    STDDEV = sqrt(0.000125) = 0.01118033989
      //    Number of points for Fair Settlement = 5min / 5min = 1
      //    Volatility Fair Settlement (USD) = 0.01118033989 * sqrt(1) = 0.01118033989

      //    Volatility Fair Settlement for quote (Token) = 0.01118033989 / 1 = 0.01118033989
      //    Slippage BPS for quote = ceil(0.01118033989 * 10000) = 112
      //    Adjusted Slippage for quote = 112

      // THEN: Both legs carry the identical series, so the pair against itself never moves
      expect(result).toBe(MIN_SLIPPAGE_BPS)

      // WHEN: Get slippage (inverting the tokens)
      const resultTokensInverted = await slippageService.getSlippageBps({
        chainId,
        quoteTokenAddress: baseTokenAddress,
        baseTokenAddress: quoteTokenAddress,
      })

      // THEN: The same inverted
      expect(resultTokensInverted).toBe(MIN_SLIPPAGE_BPS)
    })

    it(`should return 0 volatility if we can't estimate the USD price of a token`, async () => {
      // GIVEN: The prices have high volatility
      getUsdPrices.mockResolvedValue(getPoints([100, 100.01, 100.02, 100.03]))

      getUsdPrice.mockImplementation(async (chainId, tokenAddress) => {
        if (tokenAddress === quoteTokenAddress) {
          // GIVEN: Base token is 1 USD
          return 1
        } else {
          // GIVEN: Quote token is not available
          return null
        }
      })

      // WHEN: Get slippage
      const result = await slippageService.getSlippageBps({
        chainId,
        baseTokenAddress,
        quoteTokenAddress,
      })

      // THEN: We get 0 slippage
      expect(result).toBe(0)

      // WHEN: Get slippage (inverting the tokens)
      const resultInverted = await slippageService.getSlippageBps({
        chainId,
        baseTokenAddress: quoteTokenAddress,
        quoteTokenAddress: baseTokenAddress,
      })

      // THEN: The result should be the same (worst of the two)
      expect(resultInverted).toBe(0)
    })
  })
})

/**
 * FE-756: the estimator measures how much the price changes from one reading to the next and leaves
 * room above an ordinary change, instead of measuring how far the readings sit from their 24h
 * average and stopping at one standard deviation of that.
 */
describe('SlippageServiceMain: volatility estimator', () => {
  let slippageService: SlippageServiceMain

  const chainId = SupportedChainId.MAINNET
  const baseTokenAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
  const quoteTokenAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'

  /** Quote leg held flat, so the pair series is just the base series. */
  const flat = (length: number) => getPoints(new Array(length).fill(1))

  async function slippageFor(basePrices: number[]): Promise<number> {
    getUsdPrices.mockImplementation(
      getUsdPricesMockFn(baseTokenAddress, getPoints(basePrices), flat(basePrices.length))
    )
    getUsdPrice.mockImplementation(getUsdPriceMockFn(baseTokenAddress, basePrices[basePrices.length - 1], 1))

    return slippageService.getSlippageBps({ chainId, baseTokenAddress, quoteTokenAddress })
  }

  beforeEach(() => {
    slippageService = new SlippageServiceMain({ name: 'Mock', getUsdPrice, getUsdPrices })
  })

  it('prices a pair that jumps between readings above one that drifts through the same prices', async () => {
    // GIVEN: two series built from the very same four prices, so they share a mean and a spread
    //        around it, and today's estimator cannot tell them apart. Only the order differs:
    //        one walks up in ~2% steps, the other swings 4% then -2% then 4%.
    const drifting = await slippageFor([100, 102, 104, 106])
    const jumping = await slippageFor([100, 104, 102, 106])

    // THEN: the one that actually moves more between readings is the riskier one to settle
    expect(jumping).toBeGreaterThan(drifting)
  })

  it('prices above an ordinary price change, not level with it', async () => {
    // GIVEN: a pair that steps 1% (100 bps) every reading, up and back down
    const result = await slippageFor([100, 101, 100, 101, 100, 101])

    // THEN: a suggestion the size of an ordinary step absorbs nothing bigger than ordinary.
    //       Three standard deviations of a ~1% step lands near 270 bps.
    expect(result).toBeGreaterThan(200)
    expect(result).toBeLessThan(400)
  })

  it('prices the biggest change it actually saw when that beats an ordinary one', async () => {
    // GIVEN: 100 price changes — 96 of them 0.1% and 4 of 2%, alternating so the level returns home
    const spiky = [100]
    for (let i = 1; i <= 100; i++) {
      const pct = i % 25 === 0 ? 0.02 : 0.001
      spiky.push(spiky[i - 1] * (i % 2 === 1 ? 1 + pct : 1 - pct))
    }

    const result = await slippageFor(spiky)

    // THEN: we price the 2% change we actually saw, not the calm that surrounds it.
    //    VARIANCE   = (96 * 0.001^2 + 4 * 0.0202^2) / 100 = 1.696e-5
    //    STDDEV     = 0.004118, so 3 standard deviations is 0.01235 = 124 bps
    //    BIGGEST    = skipping the top 1% of 100 changes leaves index 98, a 2% drop:
    //                 |ln(0.98)| = 0.0202027 = 203 bps
    //    The biggest change is the larger of the two, so that is what we serve
    expect(result).toBe(203)
  })

  it('floors a pair it measured as calm, rather than suggesting nothing', async () => {
    // GIVEN: a pair whose price genuinely did not move
    const result = await slippageFor([100, 100, 100, 100])

    // THEN: measured-and-calm still gets a floor; it is not the same as "no opinion"
    expect(result).toBe(MIN_SLIPPAGE_BPS)
  })

  it('still answers 0 when there is no price data to measure, so callers keep their own default', async () => {
    // GIVEN: no price history at all
    getUsdPrices.mockResolvedValue(null)

    const result = await slippageService.getSlippageBps({ chainId, baseTokenAddress, quoteTokenAddress })

    // THEN: 0 is this endpoint saying "I don't know" — flooring it would turn that into a real
    //       suggestion and stop callers substituting their own, much larger, default.
    expect(result).toBe(0)
  })
})

function getPoints(prices: number[], timeBetweenPoints = FIVE_MIN, startDate = Date.now()): PricePoint[] {
  return prices.map((price, i) => ({
    date: new Date(startDate + timeBetweenPoints * i),
    price,
    volume: 1,
  }))
}

function getUsdPricesMockFn(
  baseTokenAddress: string,
  tokenAPoints: PricePoint[] | null,
  tokenBPoints: PricePoint[] | null
) {
  return async (_chainId: SupportedChainId, tokenAddress: string, _interval?: any) => {
    if (tokenAddress === baseTokenAddress) {
      // GIVEN: One token is volatile
      return tokenAPoints
    } else {
      // GIVEN: The other token is not
      return tokenBPoints
    }
  }
}

function getUsdPriceMockFn(baseTokenAddress: string, tokenAPrice: number | null, tokenBPrice: number | null) {
  return async (_chainId: SupportedChainId, tokenAddress: string, _interval?: any) => {
    if (tokenAddress === baseTokenAddress) {
      // GIVEN: One token is volatile
      return tokenAPrice
    } else {
      // GIVEN: The other token is not
      return tokenBPrice
    }
  }
}
