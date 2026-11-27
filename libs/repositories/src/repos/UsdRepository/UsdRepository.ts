import { AsyncLocalStorage } from 'async_hooks'

export const usdRepositorySymbol = Symbol.for('UsdRepository')

export type PriceStrategy = '5m' | 'hourly' | 'daily'

/**
 * Seconds a cached series stays current: the cadence at which Coingecko publishes a new point.
 * `daily` is an hour rather than a day because its points are 00:00 UTC snapshots, so a day-long entry
 * written before midnight would hide the next one.
 */
export const PRICE_SERIES_CACHE_SECONDS: Record<PriceStrategy, number> = {
  '5m': 5 * 60,
  hourly: 60 * 60,
  daily: 60 * 60,
}

const priceSeriesExpiry = new AsyncLocalStorage<{ expiresAt: number }>()

/** Cap an HTTP response by the earliest price-series cache expiry seen while computing it. */
export async function withPriceSeriesCacheTtl<T>(
  maxTtlSeconds: number,
  getValue: () => Promise<T>
): Promise<{ value: T; cacheTtlSeconds: number }> {
  const context = { expiresAt: Date.now() + maxTtlSeconds * 1000 }
  const value = await priceSeriesExpiry.run(context, getValue)
  return { value, cacheTtlSeconds: Math.max(0, Math.floor((context.expiresAt - Date.now()) / 1000)) }
}

export function recordPriceSeriesCacheTtl(ttlSeconds: number | null | undefined): void {
  const context = priceSeriesExpiry.getStore()
  if (context) {
    context.expiresAt = Math.min(context.expiresAt, Date.now() + Math.max(0, ttlSeconds ?? 0) * 1000)
  }
}

export interface PricePoint {
  /**
   * Date and time of the price point
   */
  date: Date

  /**
   * Price
   */
  price: number

  /**
   * Volume traded at that price
   */
  volume: number
}

export interface UsdRepository {
  name: string

  getUsdPrice(chainIdOrSlug: string, tokenAddress?: string | undefined): Promise<number | null>

  getUsdPrices(
    chainIdOrSlug: string,
    tokenAddress: string | undefined,
    priceStrategy: PriceStrategy
  ): Promise<PricePoint[] | null>
}

export class UsdRepositoryNoop implements UsdRepository {
  name = 'Noop'

  async getUsdPrice(chainIdOrSlug: string, tokenAddress?: string | undefined): Promise<number | null> {
    return null
  }
  async getUsdPrices(
    chainIdOrSlug: string,
    tokenAddress: string | undefined,
    priceStrategy: PriceStrategy
  ): Promise<PricePoint[] | null> {
    return null
  }
}

export const serializePricePoints = (pricePoints: PricePoint[]): string => {
  const serialized = pricePoints.map((point) => ({
    ...point,
    date: point.date.toISOString(),
  }))
  return JSON.stringify(serialized)
}

export type PricePointSerializable = Omit<PricePoint, 'date'> & {
  date: string
}

export const deserializePricePoints = (serializedPricePoints: string): PricePoint[] => {
  const parsed: PricePointSerializable[] = JSON.parse(serializedPricePoints)
  return parsed.map((point) => ({
    ...point,
    date: new Date(point.date),
  }))
}
