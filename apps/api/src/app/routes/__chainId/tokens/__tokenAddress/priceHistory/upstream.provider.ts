import Ajv from 'ajv'
import { FromSchema } from 'json-schema-to-ts'
import { upstreamPriceHistoryPayloadSchema } from './priceHistory.schemas'
import {
  PRICE_HISTORY_PROVIDER_IDS,
  PriceHistoryBar,
  PriceHistoryInterval,
  PriceHistoryProvider,
  PriceHistoryRequest,
} from './priceHistory.types'

const UPSTREAM_RESOLUTION_BY_INTERVAL = {
  '1m': 'OHLC_RESOLUTION_ONE_MINUTE',
  '5m': 'OHLC_RESOLUTION_FIVE_MINUTE',
  '1h': 'OHLC_RESOLUTION_ONE_HOUR',
  '4h': 'OHLC_RESOLUTION_FOUR_HOUR',
  '1d': 'OHLC_RESOLUTION_ONE_DAY',
} as const satisfies Partial<Record<PriceHistoryInterval, string>>

const INTERVAL_SECONDS: Record<keyof typeof UPSTREAM_RESOLUTION_BY_INTERVAL, number> = {
  '1m': 60,
  '5m': 5 * 60,
  '1h': 60 * 60,
  '4h': 4 * 60 * 60,
  '1d': 24 * 60 * 60,
}

type UpstreamPriceHistoryPayload = FromSchema<typeof upstreamPriceHistoryPayloadSchema>

const validateUpstreamPayload = new Ajv().compile<UpstreamPriceHistoryPayload>(upstreamPriceHistoryPayloadSchema)

export class UpstreamPriceHistoryProvider implements PriceHistoryProvider {
  readonly id = PRICE_HISTORY_PROVIDER_IDS.UPSTREAM

  constructor(private readonly upstream: string) {}

  supportsInterval(interval: PriceHistoryInterval): boolean {
    return interval in UPSTREAM_RESOLUTION_BY_INTERVAL
  }

  async fetchBars(request: PriceHistoryRequest, signal: AbortSignal): Promise<PriceHistoryBar[]> {
    const interval = request.interval as keyof typeof UPSTREAM_RESOLUTION_BY_INTERVAL
    const response = await globalThis.fetch(this.upstream, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Connect-Protocol-Version': '1',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        singleChain: {
          chainId: request.chainId,
          address: request.tokenAddress.toLowerCase(),
        },
        startTime: new Date(getEffectiveFrom(request, interval) * 1000).toISOString(),
        endTime: new Date(request.to * 1000).toISOString(),
        resolution: UPSTREAM_RESOLUTION_BY_INTERVAL[interval],
      }),
      signal,
    })

    if (!response.ok) {
      throw new Error(`Upstream request failed (${response.status})`)
    }

    const payload: unknown = await response.json()
    if (!validateUpstreamPayload(payload)) {
      throw new Error('Upstream returned an invalid response')
    }

    return payload.candles.flatMap((candle) =>
      candle === null
        ? []
        : [
            {
              timestamp: Number(candle.timestamp),
              open: candle.openUsd,
              high: candle.highUsd,
              low: candle.lowUsd,
              close: candle.closeUsd,
            },
          ]
    )
  }
}

function getEffectiveFrom(
  request: PriceHistoryRequest,
  interval: keyof typeof UPSTREAM_RESOLUTION_BY_INTERVAL
): number {
  if (request.countback === undefined) {
    return request.from
  }

  return Math.min(request.from, Math.max(0, request.to - request.countback * INTERVAL_SECONDS[interval]))
}
