import {
  UsdRepository,
  usdRepositorySymbol,
  SupportedChainId,
} from '@cowprotocol/repositories';
import { injectable, inject } from 'inversify';
import {
  Bps,
  GetSlippageBpsParams,
  OrderForSlippageCalculation,
  SlippageService,
} from './SlippageService';
import ms from 'ms';

const MIN_SLIPPAGE_BPS = 50;
const MAX_SLIPPAGE_BPS = 200;
const FAIR_TIME_TO_SETTLEMENT = ms('5min');

@injectable()
export class SlippageServiceMain implements SlippageService {
  constructor(
    @inject(usdRepositorySymbol)
    private usdRepository: UsdRepository
  ) {}

  async getSlippageBps(params: GetSlippageBpsParams): Promise<Bps> {
    // TODO: Implement slippage calculation for small orders

    const volatilityOnExpiration = await this.getMaxVolatilityOnExpiration(
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

  private async getMaxVolatilityOnExpiration({
    order,
    chainId,
    baseTokenAddress,
    quoteTokenAddress,
  }: GetSlippageBpsParams) {
    // Get the 5min standard deviation for the quote token (~288 points, 5min apart)
    const [volatilityQuote, volatilityBase] = await Promise.all([
      this.getVolatilityOnSettlement(chainId, quoteTokenAddress, order),
      this.getVolatilityOnSettlement(chainId, baseTokenAddress, order),
    ]);

    if (volatilityQuote === null || volatilityBase === null) {
      return null;
    }

    return Math.max(volatilityQuote, volatilityBase);
  }

  /**
   * Get the volatility of the asset in some time (enough for a solver to execute a solvable order)
   *
   * @param chainId
   * @param tokenAddress
   *
   * @returns volatility in decimal format
   */
  private async getVolatilityOnSettlement(
    chainId: SupportedChainId,
    tokenAddress: string,
    order?: OrderForSlippageCalculation
  ): Promise<number | null> {
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

    // Calculate the average of the prices (in USD)
    const averagePrice =
      prices.reduce((acc, price) => acc + price.price, 0) / prices.length;

    // Calculate price differences between each price point and the average
    const priceDifferences = prices.map((price) => price.price - averagePrice);

    // Square the differences
    const squaredDifferences = priceDifferences.map(
      (difference) => difference ** 2
    );

    // Calculate the variance
    const variance =
      squaredDifferences.reduce((acc, difference) => acc + difference, 0) /
      prices.length;

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

    return normalizedVolatility;
  }
}
