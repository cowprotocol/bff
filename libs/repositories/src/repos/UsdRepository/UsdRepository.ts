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
  name: string;

  getUsdPrice(
    chainIdOrSlug: string,
    tokenAddress?: string | undefined
  ): Promise<number | null>;

  getUsdPrices(
    chainIdOrSlug: string,
    tokenAddress: string | undefined,
    priceStrategy: PriceStrategy
  ): Promise<PricePoint[] | null>;
}

export class UsdRepositoryNoop implements UsdRepository {
  name = 'Noop';

  async getUsdPrice(
    chainIdOrSlug: string,
    tokenAddress?: string | undefined
  ): Promise<number | null> {
    return null;
  }
  async getUsdPrices(
    chainIdOrSlug: string,
    tokenAddress: string | undefined,
    priceStrategy: PriceStrategy
  ): Promise<PricePoint[] | null> {
    return null;
  }
}

export const serializePricePoints = (pricePoints: PricePoint[]): string => {
  const serialized = pricePoints.map((point) => ({
    ...point,
    date: point.date.toISOString(),
  }));
  return JSON.stringify(serialized);
};

export type PricePointSerializable = Omit<PricePoint, 'date'> & {
  date: string;
};

export const deserializePricePoints = (
  serializedPricePoints: string
): PricePoint[] => {
  const parsed: PricePointSerializable[] = JSON.parse(serializedPricePoints);
  return parsed.map((point) => ({
    ...point,
    date: new Date(point.date),
  }));
};
