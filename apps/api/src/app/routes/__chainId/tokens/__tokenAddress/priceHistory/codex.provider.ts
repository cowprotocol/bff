import Ajv from 'ajv'
import { FromSchema } from 'json-schema-to-ts'
import { codexPriceHistoryPayloadSchema } from './priceHistory.schemas'
import {
  PRICE_HISTORY_PROVIDER_IDS,
  PriceHistoryBar,
  PriceHistoryInterval,
  PriceHistoryProvider,
  PriceHistoryRequest,
} from './priceHistory.types'

const CODEX_API_URL = 'https://graph.codex.io/graphql'

const CODEX_RESOLUTION_BY_INTERVAL: Record<PriceHistoryInterval, string> = {
  '1m': '1',
  '5m': '5',
  '15m': '15',
  '1h': '60',
  '4h': '240',
  '1d': '1D',
  '7d': '7D',
}

const TOKEN_BARS_QUERY = `
  query GetTokenBars(
    $countback: Int
    $from: Int!
    $resolution: String!
    $symbol: String!
    $to: Int!
  ) {
    getTokenBars(
      countback: $countback
      currencyCode: USD
      from: $from
      removeEmptyBars: true
      removeLeadingNullValues: true
      resolution: $resolution
      symbol: $symbol
      to: $to
    ) {
      o
      h
      l
      c
      t
      volume
    }
  }
`

type CodexPriceHistoryPayload = FromSchema<typeof codexPriceHistoryPayloadSchema>
type CodexTokenBars = CodexPriceHistoryPayload['data']['getTokenBars']

const validateCodexPayload = new Ajv().compile<CodexPriceHistoryPayload>(codexPriceHistoryPayloadSchema)

export class CodexPriceHistoryProvider implements PriceHistoryProvider {
  readonly id = PRICE_HISTORY_PROVIDER_IDS.CODEX

  constructor(private readonly apiKey: string) {}

  supportsInterval(interval: PriceHistoryInterval): boolean {
    return interval in CODEX_RESOLUTION_BY_INTERVAL
  }

  async fetchBars(request: PriceHistoryRequest, signal: AbortSignal): Promise<PriceHistoryBar[]> {
    const response = await globalThis.fetch(CODEX_API_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: this.apiKey,
        'Content-Type': 'application/json',
        'X-Apollo-Operation-Name': 'GetTokenBars',
      },
      body: JSON.stringify({
        query: TOKEN_BARS_QUERY,
        variables: {
          symbol: `${request.tokenAddress.toLowerCase()}:${request.chainId}`,
          from: request.from,
          to: request.to,
          resolution: CODEX_RESOLUTION_BY_INTERVAL[request.interval],
          countback: request.countback,
        },
      }),
      signal,
    })

    if (!response.ok) {
      throw new Error(`Codex request failed (${response.status})`)
    }

    const payload: unknown = await response.json()
    if (!validateCodexPayload(payload)) {
      throw new Error('Codex returned an invalid response')
    }

    return mapCodexBars(payload.data.getTokenBars)
  }
}

function mapCodexBars(bars: CodexTokenBars): PriceHistoryBar[] {
  const length = bars.t.length
  if (bars.o.length !== length || bars.h.length !== length || bars.l.length !== length || bars.c.length !== length) {
    throw new Error('Codex returned inconsistent arrays')
  }

  return bars.t.flatMap((timestamp, index) => {
    const open = bars.o[index]
    const high = bars.h[index]
    const low = bars.l[index]
    const close = bars.c[index]
    const rawVolume = bars.volume?.[index]

    if (open === null || high === null || low === null || close === null) {
      return []
    }

    const volume = typeof rawVolume === 'string' ? Number(rawVolume) : undefined

    return [
      {
        timestamp,
        open,
        high,
        low,
        close,
        ...(volume !== undefined && Number.isFinite(volume) && volume >= 0 ? { volume } : {}),
      },
    ]
  })
}
