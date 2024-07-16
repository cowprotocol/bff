import { SupportedChainId } from '../types';

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
  getUsdPrice(
    chainId: SupportedChainId,
    tokenAddress: string
  ): Promise<number | null>;

  getUsdPrices(
    chainId: SupportedChainId,
    tokenAddress: string,
    priceStrategy: PriceStrategy
  ): Promise<PricePoint[] | null>;
}

export class UsdRepositoryNoop implements UsdRepository {
  getUsdPrice(
    chainId: SupportedChainId,
    tokenAddress: string
  ): Promise<number> {
    return null;
  }
  getUsdPrices(
    chainId: SupportedChainId,
    tokenAddress: string,
    priceStrategy: PriceStrategy
  ): Promise<PricePoint[] | null> {
    return null;
  }
}
