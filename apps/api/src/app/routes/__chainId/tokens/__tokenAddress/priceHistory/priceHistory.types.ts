export const PRICE_HISTORY_PROVIDER_IDS = {
  UPSTREAM: 1,
  CODEX: 2,
} as const

export type PriceHistoryProviderId = (typeof PRICE_HISTORY_PROVIDER_IDS)[keyof typeof PRICE_HISTORY_PROVIDER_IDS]
export type PriceHistoryProviderName = keyof typeof PRICE_HISTORY_PROVIDER_IDS

export function getProviderName(providerId: PriceHistoryProviderId): PriceHistoryProviderName {
  const entry = Object.entries(PRICE_HISTORY_PROVIDER_IDS).find(([, id]) => id === providerId)
  if (!entry) {
    throw new Error(`Unknown price history provider ID: ${providerId}`)
  }

  return entry[0] as PriceHistoryProviderName
}

export const PRICE_HISTORY_INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d', '7d'] as const

export type PriceHistoryInterval = (typeof PRICE_HISTORY_INTERVALS)[number]

export interface PriceHistoryRequest {
  chainId: number
  tokenAddress: string
  from: number
  to: number
  interval: PriceHistoryInterval
  countback?: number
}

export interface PriceHistoryBar {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export interface PriceHistoryResult {
  providerId: PriceHistoryProviderId
  bars: PriceHistoryBar[]
}

export interface PriceHistoryProvider {
  readonly id: PriceHistoryProviderId
  supportsInterval(interval: PriceHistoryInterval): boolean
  fetchBars(request: PriceHistoryRequest, signal: AbortSignal): Promise<PriceHistoryBar[]>
}

export function normalizePriceHistoryBars(bars: PriceHistoryBar[]): PriceHistoryBar[] {
  const byTimestamp = new Map<number, PriceHistoryBar>()

  for (const bar of bars) {
    if (!isValidBar(bar)) {
      throw new Error('Price history provider returned an invalid bar')
    }

    byTimestamp.set(bar.timestamp, bar)
  }

  return [...byTimestamp.values()].sort((a, b) => a.timestamp - b.timestamp)
}

function isValidBar(bar: PriceHistoryBar): boolean {
  const prices = [bar.open, bar.high, bar.low, bar.close]

  return (
    Number.isInteger(bar.timestamp) &&
    bar.timestamp >= 0 &&
    prices.every((price) => Number.isFinite(price) && price > 0) &&
    (bar.volume === undefined || (Number.isFinite(bar.volume) && bar.volume >= 0)) &&
    bar.high >= Math.max(bar.open, bar.close, bar.low) &&
    bar.low <= Math.min(bar.open, bar.close, bar.high)
  )
}
