import { PricePoint, UsdRepository, usdRepositorySymbol } from '@cowprotocol/repositories'
import { injectable, inject } from 'inversify'
import {
  Bps,
  GetSlippageBpsParams,
  OrderForSlippageCalculation,
  PairVolatility,
  SlippageService,
  VolatilityDetails,
} from './SlippageService'
import ms from 'ms'
import { toTokenAddress } from '@cowprotocol/shared'
import { SupportedChainId } from '@cowprotocol/cow-sdk'

const FAIR_TIME_TO_SETTLEMENT = ms('5min')

export const MIN_SLIPPAGE_BPS = 2

/**
 * What we multiply the standard deviation by.
 *
 * One standard deviation is about the size of an ordinary price change, and ordinary price changes
 * are not what slippage is for. Multiplying by 3 leaves room for the busier five minutes.
 */
const STANDARD_DEVIATION_MULTIPLIER = 3

/**
 * Share of the largest price changes to skip over when picking the biggest one.
 *
 * We look at the biggest change the pair really made as well, because a token that sits still and
 * then jumps has a small standard deviation and a large problem. Skipping the top 1% keeps one bad
 * reading from Coingecko from setting the suggestion for the whole pair.
 */
const EXTREME_CHANGES_SKIPPED = 0.01

@injectable()
export class SlippageServiceMain implements SlippageService {
  constructor(
    @inject(usdRepositorySymbol)
    private usdRepository: UsdRepository
  ) {}

  async getSlippageBps(params: GetSlippageBpsParams): Promise<Bps> {
    // Try relative volatility first
    const relativeVolatility = await this.getRelativeVolatilityOnSettlement(params)

    // If relative volatility is available, use it
    if (relativeVolatility !== null) {
      return this.getSlippageBpsFromVolatility(relativeVolatility)
    }

    // Fall back to max volatility if relative volatility cannot be calculated
    const maxVolatility = await this.getMaxVolatilityOnSettlement(params)

    // If volatility is unknown, we return 0
    if (maxVolatility === null) {
      return 0
    }

    // Return the slippage based on the volatility
    return this.getSlippageBpsFromVolatility(maxVolatility)
  }

  private getSlippageBpsFromVolatility(volatility: number): Bps {
    return Math.max(MIN_SLIPPAGE_BPS, Math.ceil(volatility * 10_000))
  }

  /**
   * Get the volatility of the asset in some time (enough for a solver to execute a solvable order)
   *
   * @param chainId
   * @param tokenAddressString
   *
   * @returns volatility in decimal format
   */
  async getVolatilityDetails(
    chainId: SupportedChainId,
    tokenAddressString: string,
    order?: OrderForSlippageCalculation
  ): Promise<VolatilityDetails | null> {
    const tokenAddress = toTokenAddress(tokenAddressString, chainId)
    const prices = await this.usdRepository.getUsdPrices(chainId.toString(), tokenAddress, '5m')

    if (!prices) {
      return null
    }

    // Get price of the token
    const usdPrice = await this.usdRepository.getUsdPrice(chainId.toString(), tokenAddress)

    if (!usdPrice) {
      return null
    }

    // Already relative to the price, so nothing to normalize
    const volatility = this.calculateVolatility(prices)

    // Too few usable points to measure: unknown, not calm
    if (volatility === null) {
      return null
    }

    return {
      tokenAddress,
      prices,
      usdPrice,
      volatilityInUsd: volatility * usdPrice,
      volatilityInTokens: volatility,
    }
  }

  /**
   * Gets the volatility of the pair in relation to each other, based on the historical USD price of each
   * Returns `null` if either historical data is missing
   *
   * @param chainId
   * @param baseTokenAddress
   * @param quoteTokenAddress
   */
  async getVolatilityForPair(
    chainId: SupportedChainId,
    baseTokenAddress: string,
    quoteTokenAddress: string,
    order?: OrderForSlippageCalculation
  ): Promise<PairVolatility | null> {
    // Fetch USD prices for both tokens
    const [basePrices, quotePrices] = await Promise.all([
      this.usdRepository.getUsdPrices(chainId.toString(), baseTokenAddress, '5m'),
      this.usdRepository.getUsdPrices(chainId.toString(), quoteTokenAddress, '5m'),
    ])

    // Check if either price data is missing
    if (!basePrices || !quotePrices) {
      return null
    }

    // Fetch USD prices for both tokens
    const [baseUsdPrice, quoteUsdPrice] = await Promise.all([
      this.usdRepository.getUsdPrice(chainId.toString(), baseTokenAddress),
      this.usdRepository.getUsdPrice(chainId.toString(), quoteTokenAddress),
    ])

    // Check if either USD price is missing
    if (baseUsdPrice === null || quoteUsdPrice === null) {
      return null
    }

    // Prices is an array. Build a map with timestamp as key using `basePrices` date, so we can match with the timestamp on `quotePrices`
    const basePricesMap = new Map(basePrices.map((price) => [roundDate(price.date).getTime(), price]))

    // Calculate price ratios for the token prices
    const prices = quotePrices.reduce<PricePoint[]>((acc, quotePrice) => {
      // Get the same timestamp
      const roundedDate = roundDate(quotePrice.date)
      const basePrice = basePricesMap.get(roundedDate.getTime())

      if (quotePrice && basePrice) {
        const price = basePrice.price / quotePrice.price // Calculate the price ratio
        acc.push({
          ...basePrice,
          price,
          date: roundedDate,
        } as PricePoint)
      }
      return acc
    }, [])

    // Not enough data, data point don't align
    if (prices.length < 2) {
      return null
    }

    // Already relative to the pair price, so nothing to normalize
    const volatility = this.calculateVolatility(prices)

    // Too few usable points to measure: unknown, not calm
    if (volatility === null) {
      return null
    }

    return {
      baseTokenAddress,
      quoteTokenAddress,
      prices,
      volatilityInTokens: volatility,
    }
  }

  private async getMaxVolatilityOnSettlement({
    order,
    chainId,
    baseTokenAddress,
    quoteTokenAddress,
  }: GetSlippageBpsParams) {
    // Get the 5min standard deviation for the quote token (~288 points, 5min apart)
    const [volatilityQuote, volatilityBase] = await Promise.all([
      this.getVolatilityDetails(chainId, quoteTokenAddress, order),
      this.getVolatilityDetails(chainId, baseTokenAddress, order),
    ])

    if (volatilityQuote === null || volatilityBase === null) {
      return null
    }

    return Math.max(volatilityQuote.volatilityInTokens, volatilityBase.volatilityInTokens)
  }

  private async getRelativeVolatilityOnSettlement({
    order,
    chainId,
    baseTokenAddress,
    quoteTokenAddress,
  }: GetSlippageBpsParams) {
    const volatility = await this.getVolatilityForPair(chainId, baseTokenAddress, quoteTokenAddress, order)

    if (!volatility) {
      return null
    }

    return volatility.volatilityInTokens
  }

  /**
   * Relative volatility (a fraction of price) expected over FAIR_TIME_TO_SETTLEMENT.
   *
   * Measured on how much the price changes from one reading to the next, not on how far the
   * readings sit from their 24h average. The second one scores a slow all-day drift the same as a
   * price that bounces every ten minutes — feed it the same prices in a different order and it does
   * not notice — and only the bouncing one is a risk to a 5 minute settlement.
   *
   * Two answers are worked out and the larger wins: the size of an ordinary price change with room
   * added on top, and the size of the biggest change that actually happened. Each covers for the
   * other. The first alone under-prices a thin memecoin pair, which is quiet until it jumps. The
   * second alone under-prices a pair whose 24 hours happened to be calm, leaving no large change
   * in the window to find.
   *
   * Returns null when there are too few usable readings to measure anything. That is not the same
   * as measuring no movement: the caller turns null into "no opinion" (0 bps) so consumers fall back
   * to their own default, while a pair measured as genuinely calm gets MIN_SLIPPAGE_BPS.
   */
  private calculateVolatility(prices: PricePoint[]): number | null {
    /**
     * How much the price changed between each pair of consecutive readings, as a fraction of the
     * price rather than an amount, so a token worth 0.0000009 and one worth 3000 are comparable.
     *
     * Held as the natural log of the ratio: that way a rise and the matching fall cancel out
     * instead of leaving a drift, and the changes can be added across readings, which is what lets
     * the square root below stretch one reading's worth of movement over the settlement window.
     * For changes this small it is within a rounding error of the plain percentage.
     */
    const relativePriceChanges: number[] = []

    for (let i = 1; i < prices.length; i++) {
      const previous = prices[i - 1].price
      const current = prices[i].price

      // A zero or missing price is not a -100% change, it's an absent data point
      if (previous > 0 && current > 0) {
        relativePriceChanges.push(Math.log(current / previous))
      }
    }

    if (relativePriceChanges.length < 2) {
      return null
    }

    // The size of an ordinary price change
    const averageChange = relativePriceChanges.reduce((acc, change) => acc + change, 0) / relativePriceChanges.length
    const variance =
      relativePriceChanges.reduce((acc, change) => acc + (change - averageChange) ** 2, 0) / relativePriceChanges.length
    const standardDeviation = Math.sqrt(variance)

    // The size of the biggest price change, skipping the most extreme few
    const sortedChanges = relativePriceChanges.map(Math.abs).sort((a, b) => a - b)
    const biggestChange = sortedChanges[Math.floor((1 - EXTREME_CHANGES_SKIPPED) * (sortedChanges.length - 1))]

    // One point to the settlement horizon. This is ~1 on the '5m' strategy today (Coingecko's
    // points are 5min apart and so is the horizon), and stays correct if either ever changes.
    const averageTimeBetweenDataPoints =
      (prices[prices.length - 1].date.getTime() - prices[0].date.getTime()) / (prices.length - 1)
    const pointsForFairSettlement =
      averageTimeBetweenDataPoints > 0 ? FAIR_TIME_TO_SETTLEMENT / averageTimeBetweenDataPoints : 1

    const expectedChange = Math.max(STANDARD_DEVIATION_MULTIPLIER * standardDeviation, biggestChange)

    return expectedChange * Math.sqrt(pointsForFairSettlement)
  }
}

function roundDate(date: Date): Date {
  return new Date(Math.round(date.getTime() / FAIR_TIME_TO_SETTLEMENT) * FAIR_TIME_TO_SETTLEMENT)
}
