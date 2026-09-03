import { EVM_CHAIN_IDS, WrappedNativeTokenAddress } from '@cowprotocol/shared'
import { config } from 'dotenv'
import { resolve } from 'path'
import { CodexPriceHistoryProvider } from './codex.provider'
import { PRICE_HISTORY_INTERVALS, PriceHistoryInterval } from './priceHistory.types'

const FIXED_TO = Date.parse('2026-01-02T01:00:00.000Z') / 1000
const COUNTBACK = 6

config({ path: resolve(process.cwd(), '.env') })

describe('Codex price history provider (integration)', () => {
  jest.setTimeout(15_000)

  const apiKey = process.env.CODEX_API_KEY ?? ''

  beforeAll(() => {
    if (!apiKey) {
      throw new Error('CODEX_API_KEY is required for the live Codex price-history tests')
    }
  })

  it.each(EVM_CHAIN_IDS)('fetches wrapped-native bars on chain %s', async (chainId) => {
    expect(await fetchBars(chainId, WrappedNativeTokenAddress[chainId])).not.toHaveLength(0)
  })

  it('captures mainnet WETH interval results', async () => {
    const results = []

    for (const interval of PRICE_HISTORY_INTERVALS) {
      try {
        const bars = await fetchBars(1, WrappedNativeTokenAddress[1], interval)
        results.push({ interval, result: bars.length === 0 ? 'empty' : 'success' })
      } catch (error) {
        results.push({ interval, result: error instanceof Error ? error.message : 'unknown error' })
      }
    }

    expect(results).toMatchInlineSnapshot(`
      [
        {
          "interval": "1m",
          "result": "success",
        },
        {
          "interval": "5m",
          "result": "success",
        },
        {
          "interval": "15m",
          "result": "success",
        },
        {
          "interval": "1h",
          "result": "success",
        },
        {
          "interval": "4h",
          "result": "success",
        },
        {
          "interval": "1d",
          "result": "success",
        },
        {
          "interval": "7d",
          "result": "success",
        },
      ]
    `)
  })

  it('fetches recent mainnet WETH volume', async () => {
    const to = Math.floor(Date.now() / 1000) - 60
    const bars = await fetchBars(1, WrappedNativeTokenAddress[1], '1h', to)

    expect(bars.some((bar) => bar.volume !== undefined)).toBe(true)
  })

  function fetchBars(chainId: number, tokenAddress: string, interval: PriceHistoryInterval = '1h', to = FIXED_TO) {
    return new CodexPriceHistoryProvider(apiKey).fetchBars(
      {
        chainId,
        tokenAddress,
        from: to - 1,
        to,
        interval,
        countback: COUNTBACK,
      },
      new AbortController().signal
    )
  }
})
