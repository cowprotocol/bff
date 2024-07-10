export const usdRepositorySymbol = Symbol.for('UsdRepository');

export type PriceStrategy = '5m' | 'hourly' | 'daily';

export interface PricePoint {
  /**
   * Date and time of the price point
   */
  date: Date;

  /**
   * Price
   */
  price: number;

  /**
   * Volume traded at that price
   */
  volume: number;
}

export interface UsdRepository {
  getUsdPrice(chainId: number, tokenAddress: string): Promise<number | null>;

  getUsdPrices(
    chainId: number,
    tokenAddress: string,
    priceStrategy: PriceStrategy
  ): Promise<PricePoint[] | null>;
}
