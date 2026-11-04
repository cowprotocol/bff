import type { Logger } from '@cowprotocol/shared'

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

export function normalizePriceHistoryBars(bars: PriceHistoryBar[], logger: Logger): PriceHistoryBar[] {
  const byTimestamp = new Map<number, PriceHistoryBar>()
  let invalidBars = 0

  for (const bar of bars) {
    if (!isValidBar(bar)) {
      invalidBars++
      continue
    }

    byTimestamp.set(bar.timestamp, bar)
  }

  if (invalidBars) {
    logger.warn({ invalidBars }, 'Dropped invalid price history bars')
  }

  if (bars.length && !byTimestamp.size) {
    throw new Error('Price history provider returned no valid bars')
  }

  return [...byTimestamp.values()].sort((a, b) => a.timestamp - b.timestamp)
}

/**
 * Below this, identical bars say nothing: a chart polling for new bars asks for the one or two since the
 * last one it holds, and any token can sit still that long. A provider repeating one value across a window
 * this wide is reporting a placeholder, not a quiet market.
 */
const MIN_FLAT_BARS = 10

/**
 * A window whose every bar carries the same single price says nothing a chart can draw. `UPSTREAM`
 * answers USDC with exactly `1` at every resolution it serves, so the series is well-formed but is a
 * placeholder rather than a market, and callers should prefer any other provider's answer over it.
 */
export function isFlatPriceHistory(bars: PriceHistoryBar[]): boolean {
  if (bars.length < MIN_FLAT_BARS) {
    return false
  }

  const price = bars[0].open

  return bars.every((bar) => bar.open === price && bar.high === price && bar.low === price && bar.close === price)
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
