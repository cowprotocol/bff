import {
  PricePoint,
  SupportedChainId,
  UsdRepository,
  usdRepositorySymbol,
} from '@cowprotocol/repositories';
import { toTokenAddress } from '@cowprotocol/shared';
import { inject, injectable } from 'inversify';
import ms from 'ms';
import {
  Bps,
  GetSlippageBpsParams,
  OrderForSlippageCalculation,
  PairVolatility,
  SlippageService,
  VolatilityDetails,
} from './SlippageService';

export const MIN_SLIPPAGE_BPS = 50;
export const MAX_SLIPPAGE_BPS = 200;
const FAIR_TIME_TO_SETTLEMENT = ms('5min');

@injectable()
export class SlippageServiceMain implements SlippageService {
  constructor(
    @inject(usdRepositorySymbol)
    private usdRepository: UsdRepository
  ) {}

  async getSlippageBps(params: GetSlippageBpsParams): Promise<Bps> {
    const volatility = await this.getRelativeVolatilityOnSettlement(params);

    // If volatility is unknown, we return 0
    if (volatility === null) {
      return 0;
    }

    // Return the slippage based on the volatility
    return this.getSlippageBpsFromVolatility(volatility);
  }

  private getSlippageBpsFromVolatility(volatility: number): Bps {
    return Math.ceil(volatility * 10_000);
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
    const tokenAddress = toTokenAddress(tokenAddressString, chainId);
    const prices = await this.usdRepository.getUsdPrices(
      chainId,
      tokenAddress,
      '5m'
    );

    if (!prices) {
      return null;
    }

    // Get price of the token
    const usdPrice = await this.usdRepository.getUsdPrice(
      chainId,
      tokenAddress
    );

    if (!usdPrice) {
      return null;
    }

    // Predict variance between now and a fair settlement
    const volatilityForFairSettlement = this.calculateVolatility(prices);

    // Return the normalized volatility (denominated in the token, not in USD)
    const normalizedVolatility = volatilityForFairSettlement / usdPrice;

    return {
      tokenAddress,
      prices,
      usdPrice,
      volatilityInUsd: volatilityForFairSettlement,
      volatilityInTokens: normalizedVolatility,
    };
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
      this.usdRepository.getUsdPrices(chainId, baseTokenAddress, '5m'),
      this.usdRepository.getUsdPrices(chainId, quoteTokenAddress, '5m'),
    ]);

    // Check if either price data is missing
    if (!basePrices || !quotePrices) {
      return null;
    }

    // Fetch USD prices for both tokens
    const [baseUsdPrice, quoteUsdPrice] = await Promise.all([
      this.usdRepository.getUsdPrice(chainId, baseTokenAddress),
      this.usdRepository.getUsdPrice(chainId, quoteTokenAddress),
    ]);

    // Check if either USD price is missing
    if (baseUsdPrice === null || quoteUsdPrice === null) {
      return null;
    }

    const relativePrice = baseUsdPrice / quoteUsdPrice;

    // Prices is an array. Build a map with timestamp as key using `basePrices` date, so we can match with the timestamp on `quotePrices`
    const basePricesMap = new Map(
      basePrices.map((price) => [roundDate(price.date).getTime(), price])
    );

    // Calculate price ratios for the token prices
    const prices = quotePrices.reduce<PricePoint[]>((acc, quotePrice) => {
      // Get the same timestamp
      const roundedDate = roundDate(quotePrice.date);
      const basePrice = basePricesMap.get(roundedDate.getTime());

      if (quotePrice && basePrice) {
        const price = basePrice.price / quotePrice.price; // Calculate the price ratio
        acc.push({
          ...basePrice,
          price,
          date: roundedDate,
        } as PricePoint);
      }
      return acc;
    }, []);

    // Not enough data, data point don't align
    if (prices.length < 2) {
      return null;
    }

    // Predict variance between now and a fair settlement
    const volatilityForFairSettlement = this.calculateVolatility(prices);

    // Return the normalized volatility (denominated in the token, not in USD)
    const normalizedVolatility = volatilityForFairSettlement / relativePrice;

    return {
      baseTokenAddress,
      quoteTokenAddress,
      prices,
      volatilityInTokens: normalizedVolatility,
    };
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
    ]);

    if (volatilityQuote === null || volatilityBase === null) {
      return null;
    }

    return Math.max(
      volatilityQuote.volatilityInTokens,
      volatilityBase.volatilityInTokens
    );
  }

  private async getRelativeVolatilityOnSettlement({
    order,
    chainId,
    baseTokenAddress,
    quoteTokenAddress,
  }: GetSlippageBpsParams) {
    const volatility = await this.getVolatilityForPair(
      chainId,
      baseTokenAddress,
      quoteTokenAddress,
      order
    );

    if (!volatility) {
      return null;
    }

    return volatility.volatilityInTokens;
  }

  private calculateVolatility(prices: PricePoint[]): number {
    // Calculate the average of the prices (in USD)
    const averagePrice =
      prices.reduce((acc, price) => acc + price.price, 0) / prices.length;

    // Calculate the variance
    const variance =
      prices.reduce((acc, price) => {
        // Calculate price differences between the price point and the average
        const difference = price.price - averagePrice;

        // Square the difference
        const squaredDifference = difference ** 2;

        // Sum squared differences
        return acc + squaredDifference;
      }, 0) / prices.length;

    // Calculate the standard deviation
    const standardDeviation = Math.sqrt(variance);

    // Average time between each data point
    const averageTimeBetweenDataPoints =
      (prices[prices.length - 1].date.getTime() - prices[0].date.getTime()) /
      (prices.length - 1);

    // Points in Time for Settlement
    const pointsForFairSettlement =
      FAIR_TIME_TO_SETTLEMENT / averageTimeBetweenDataPoints;

    // Predict variance between now and a fair settlement
    return standardDeviation * Math.sqrt(pointsForFairSettlement);
  }
}

function roundDate(date: Date): Date {
  return new Date(
    Math.round(date.getTime() / FAIR_TIME_TO_SETTLEMENT) *
      FAIR_TIME_TO_SETTLEMENT
  );
}
