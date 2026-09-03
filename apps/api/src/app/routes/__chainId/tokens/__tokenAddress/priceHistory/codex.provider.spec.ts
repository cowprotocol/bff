import { CodexPriceHistoryProvider } from './codex.provider'
import { PRICE_HISTORY_INTERVALS, PriceHistoryRequest } from './priceHistory.types'

const REQUEST: PriceHistoryRequest = {
  chainId: 1,
  tokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  from: 1710000000,
  to: 1710007200,
  interval: '15m',
  countback: 10,
}

function response(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response
}

const mockedFetch = jest.fn<ReturnType<typeof globalThis.fetch>, Parameters<typeof globalThis.fetch>>()

describe('CodexPriceHistoryProvider', () => {
  beforeEach(() => {
    mockedFetch.mockReset()
    jest.spyOn(globalThis, 'fetch').mockImplementation(mockedFetch)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('maps every public interval', async () => {
    mockedFetch.mockResolvedValue(response({ data: { getTokenBars: { o: [], h: [], l: [], c: [], t: [] } } }))
    const provider = new CodexPriceHistoryProvider('secret')
    const resolutions = []

    for (const interval of PRICE_HISTORY_INTERVALS) {
      await provider.fetchBars({ ...REQUEST, interval }, new AbortController().signal)
      const requestBody = JSON.parse(String(mockedFetch.mock.calls.at(-1)?.[1]?.body))
      resolutions.push({ interval, resolution: requestBody.variables.resolution })
    }

    expect(resolutions).toMatchInlineSnapshot(`
      [
        {
          "interval": "1m",
          "resolution": "1",
        },
        {
          "interval": "5m",
          "resolution": "5",
        },
        {
          "interval": "15m",
          "resolution": "15",
        },
        {
          "interval": "1h",
          "resolution": "60",
        },
        {
          "interval": "4h",
          "resolution": "240",
        },
        {
          "interval": "1d",
          "resolution": "1D",
        },
        {
          "interval": "7d",
          "resolution": "7D",
        },
      ]
    `)
  })

  it('removes null bars', async () => {
    mockedFetch.mockResolvedValue(
      response({
        data: {
          getTokenBars: {
            o: [2, null, 1, 3],
            h: [3, 3, 2, 4],
            l: [1, 1, 0.5, 2],
            c: [2.5, 2, 1.5, 3.5],
            t: [1710003600, 1710001800, 1710000000, 1710003600],
          },
        },
      })
    )
    const provider = new CodexPriceHistoryProvider('secret')

    await expect(provider.fetchBars(REQUEST, new AbortController().signal)).resolves.toEqual([
      { timestamp: 1710003600, open: 2, high: 3, low: 1, close: 2.5 },
      { timestamp: 1710000000, open: 1, high: 2, low: 0.5, close: 1.5 },
      { timestamp: 1710003600, open: 3, high: 4, low: 2, close: 3.5 },
    ])
  })

  it('maps usable volume without rejecting bars that have unusable volume', async () => {
    mockedFetch.mockResolvedValue(
      response({
        data: {
          getTokenBars: {
            o: [1, 2, 3, 4, 5, 6],
            h: [2, 3, 4, 5, 6, 7],
            l: [0.5, 1, 2, 3, 4, 5],
            c: [1.5, 2.5, 3.5, 4.5, 5.5, 6.5],
            t: [1, 2, 3, 4, 5, 6],
            volume: ['123.45', '0', null, '-1', 'invalid'],
          },
        },
      })
    )
    const provider = new CodexPriceHistoryProvider('secret')

    await expect(provider.fetchBars(REQUEST, new AbortController().signal)).resolves.toEqual([
      { timestamp: 1, open: 1, high: 2, low: 0.5, close: 1.5, volume: 123.45 },
      { timestamp: 2, open: 2, high: 3, low: 1, close: 2.5, volume: 0 },
      { timestamp: 3, open: 3, high: 4, low: 2, close: 3.5 },
      { timestamp: 4, open: 4, high: 5, low: 3, close: 4.5 },
      { timestamp: 5, open: 5, high: 6, low: 4, close: 5.5 },
      { timestamp: 6, open: 6, high: 7, low: 5, close: 6.5 },
    ])
  })

  it('keeps upstream HTTP failures status-only', async () => {
    const readBody = jest.fn()
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 502,
      json: readBody,
    } as unknown as Response)
    const provider = new CodexPriceHistoryProvider('secret')

    await expect(provider.fetchBars(REQUEST, new AbortController().signal)).rejects.toMatchObject({
      message: 'Codex request failed (502)',
    })
    expect(readBody).not.toHaveBeenCalled()
  })
})
