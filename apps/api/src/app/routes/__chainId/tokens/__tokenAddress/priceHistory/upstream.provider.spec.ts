import { UpstreamPriceHistoryProvider } from './upstream.provider'
import { PriceHistoryRequest } from './priceHistory.types'

const TOKEN_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
const PRICE_HISTORY_UPSTREAM = 'https://price-history.example/GetTokenHistoryOHLC'
const REQUEST: PriceHistoryRequest = {
  chainId: 1,
  tokenAddress: TOKEN_ADDRESS,
  from: 1710000000,
  to: 1710007200,
  interval: '1h',
}

function createResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

const mockedFetch = jest.fn<ReturnType<typeof globalThis.fetch>, Parameters<typeof globalThis.fetch>>()

describe('UpstreamPriceHistoryProvider', () => {
  beforeEach(() => {
    mockedFetch.mockReset()
    jest.spyOn(globalThis, 'fetch').mockImplementation(mockedFetch)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('removes null candles and applies countback to the request range', async () => {
    mockedFetch.mockResolvedValue(
      createResponse({
        candles: [null, { timestamp: '1710000000', openUsd: 1, highUsd: 3, lowUsd: 0.5, closeUsd: 2.5 }],
      })
    )
    const provider = new UpstreamPriceHistoryProvider(PRICE_HISTORY_UPSTREAM)

    await expect(provider.fetchBars({ ...REQUEST, countback: 3 }, new AbortController().signal)).resolves.toHaveLength(
      1
    )
    const body = JSON.parse(String(mockedFetch.mock.calls[0]?.[1]?.body))
    expect(body.startTime).toBe('2024-03-09T15:00:00.000Z')
  })

  it('returns valid empty responses', async () => {
    mockedFetch.mockResolvedValue(createResponse({ candles: [] }))
    const provider = new UpstreamPriceHistoryProvider(PRICE_HISTORY_UPSTREAM)

    await expect(provider.fetchBars(REQUEST, new AbortController().signal)).resolves.toEqual([])
  })
})
