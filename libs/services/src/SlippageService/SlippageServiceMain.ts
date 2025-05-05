import { UsdRepository, usdRepositorySymbol } from '@cowprotocol/repositories';
import { SupportedChainId, toTokenAddress } from '@cowprotocol/shared';
import { inject, injectable } from 'inversify';
import ms from 'ms';
import {
  Bps,
  GetSlippageBpsParams,
  OrderForSlippageCalculation,
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
    const volatilityOnExpiration = await this.getMaxVolatilityOnSettlement(
      params
    );

    // If volatility is unknown, we take the worst case
    if (volatilityOnExpiration === null) {
      return MAX_SLIPPAGE_BPS;
    }

    // Return the slippage based on the volatility
    return this.getSlippageBpsFromVolatility(volatilityOnExpiration);
  }

  private getSlippageBpsFromVolatility(volatility: number): Bps {
    const slippageBps = Math.ceil(volatility * 10_000);

    if (slippageBps < MIN_SLIPPAGE_BPS) {
      return MIN_SLIPPAGE_BPS;
    }

    if (slippageBps > MAX_SLIPPAGE_BPS) {
      return MAX_SLIPPAGE_BPS;
    }

    return slippageBps;
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
      chainId.toString(),
      tokenAddress,
      '5m'
    );

    if (!prices) {
      return null;
    }

    // Get price of the token
    const usdPrice = await this.usdRepository.getUsdPrice(
      chainId.toString(),
      tokenAddress
    );

    if (!usdPrice) {
      return null;
    }

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
    const volatilityForFairSettlement =
      standardDeviation * Math.sqrt(pointsForFairSettlement);

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
}
