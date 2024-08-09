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
const DEFAULT_EXPIRATION_TIME_IN_SECONDS = ms('30min') / 1000;

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

    if (volatilityOnExpiration === null) {
      return MAX_SLIPPAGE_BPS;
    }

    return this.getSlippageBpsFromVolatility(volatilityOnExpiration);
  }

  private getSlippageBpsFromVolatility(volatility: number): Bps {
    const slippageBps = volatility * 10_000;

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
      this.getVolatilityOnExpiration(chainId, quoteTokenAddress, order),
      this.getVolatilityOnExpiration(chainId, baseTokenAddress, order),
    ]);

    if (volatilityQuote === null || volatilityBase === null) {
      return null;
    }

    return Math.max(volatilityQuote, volatilityBase);
  }

  /**
   * Get the volatility for the next 30min
   *
   *
   *
   * @param chainId
   * @param tokenAddress
   * @returns
   */
  private async getVolatilityOnExpiration(
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

    // Predict the 30min standard deviation for the quote token
    const expirationTimeInSeconds =
      order?.expirationTimeInSeconds || DEFAULT_EXPIRATION_TIME_IN_SECONDS;
    const dataPointsIn30min = expirationTimeInSeconds / 300; // 300 = 5min, which is the interval of the data points
    const volatility30min = standardDeviation * Math.sqrt(dataPointsIn30min);

    // Return the normalized volatility (in token, denominated in the token, not in USD)
    return volatility30min / usdPrice;
  }
}
