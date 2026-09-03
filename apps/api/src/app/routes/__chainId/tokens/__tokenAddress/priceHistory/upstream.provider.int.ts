import { EVM_CHAIN_IDS, WrappedNativeTokenAddress } from '@cowprotocol/shared'
import { config } from 'dotenv'
import { resolve } from 'path'
import { PRICE_HISTORY_INTERVALS, PriceHistoryInterval } from './priceHistory.types'
import { UpstreamPriceHistoryProvider } from './upstream.provider'

const UNSUPPORTED_CHAIN_IDS = [100, 9745] as const
const unsupportedChainIds = new Set<number>(UNSUPPORTED_CHAIN_IDS)
const UPSTREAM_CHAIN_IDS = EVM_CHAIN_IDS.filter((chainId) => !unsupportedChainIds.has(chainId))
const COUNTBACK = 6

config({ path: resolve(process.cwd(), '.env') })

const PRICE_HISTORY_UPSTREAM = process.env.PRICE_HISTORY_UPSTREAM ?? ''

describe('Upstream price history provider (integration)', () => {
  jest.setTimeout(15_000)

  beforeAll(() => {
    if (!PRICE_HISTORY_UPSTREAM) {
      throw new Error('PRICE_HISTORY_UPSTREAM is required for the live price-history upstream tests')
    }
  })

  it.each(UPSTREAM_CHAIN_IDS)('fetches wrapped-native bars on chain %s', async (chainId) => {
    expect(await fetchBars(chainId, WrappedNativeTokenAddress[chainId])).not.toHaveLength(0)
  })

  it('captures mainnet WETH interval results', async () => {
    const provider = new UpstreamPriceHistoryProvider(PRICE_HISTORY_UPSTREAM)
    const results = []

    for (const interval of PRICE_HISTORY_INTERVALS) {
      if (!provider.supportsInterval(interval)) {
        results.push({ interval, result: 'error: unsupported interval' })
        continue
      }

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
          "result": "error: unsupported interval",
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
          "result": "error: unsupported interval",
        },
      ]
    `)
  })

  it('captures unsupported EVM chain results', async () => {
    const results = await Promise.all(
      UNSUPPORTED_CHAIN_IDS.map(async (chainId) => {
        try {
          await fetchBars(chainId, WrappedNativeTokenAddress[chainId])
          return { chainId, result: 'supported' }
        } catch (error) {
          return { chainId, result: error instanceof Error ? error.message : 'unknown error' }
        }
      })
    )

    expect(results).toMatchInlineSnapshot(`
      [
        {
          "chainId": 100,
          "result": "Upstream request failed (400)",
        },
        {
          "chainId": 9745,
          "result": "Upstream request failed (400)",
        },
      ]
    `)
  })
})

function fetchBars(chainId: number, tokenAddress: string, interval: PriceHistoryInterval = '1h') {
  const to = Math.floor(Date.now() / 1000) - 60

  return new UpstreamPriceHistoryProvider(PRICE_HISTORY_UPSTREAM).fetchBars(
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
