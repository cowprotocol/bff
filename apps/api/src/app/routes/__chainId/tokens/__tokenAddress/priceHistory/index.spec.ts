import fastify, { FastifyInstance } from 'fastify'
import priceHistory from './index'

const mockedFetch = jest.fn<ReturnType<typeof globalThis.fetch>, Parameters<typeof globalThis.fetch>>()
const TOKEN_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
const PRICE_HISTORY_URL = `/1/tokens/${TOKEN_ADDRESS}/priceHistory?from=1710000000&to=1710007200&interval=1h`

function createResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
  } as Response
}

async function buildApp(apiKey = 'test-api-key', providerOrder = '1,2'): Promise<FastifyInstance> {
  const app = fastify()
  try {
    app.decorate('config', {
      CODEX_API_KEY: apiKey,
      PRICE_HISTORY_PROVIDER_ORDER: providerOrder,
      PRICE_HISTORY_UPSTREAM: 'https://price-history.example/GetTokenHistoryOHLC',
    })
    await app.register(priceHistory, { prefix: '/:chainId/tokens/:tokenAddress/priceHistory' })
    await app.ready()
    return app
  } catch (error) {
    await app.close()
    throw error
  }
}

describe('price history route', () => {
  let app: FastifyInstance | undefined

  beforeEach(() => {
    mockedFetch.mockReset()
    jest.spyOn(globalThis, 'fetch').mockImplementation(mockedFetch)
  })

  afterEach(async () => {
    await app?.close()
    app = undefined
    jest.restoreAllMocks()
  })

  it('returns normalized upstream bars', async () => {
    app = await buildApp()
    mockedFetch.mockResolvedValue(
      createResponse({
        candles: [
          { timestamp: '1710003600', openUsd: 2, highUsd: 4, lowUsd: 1, closeUsd: 3 },
          { timestamp: '1710000000', openUsd: 1, highUsd: 3, lowUsd: 0.5, closeUsd: 2.5 },
        ],
      })
    )

    const response = await app.inject({
      method: 'GET',
      url: PRICE_HISTORY_URL,
      headers: { origin: 'https://swap.cow.fi' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      providerId: 1,
      bars: [
        { timestamp: 1710000000, open: 1, high: 3, low: 0.5, close: 2.5 },
        { timestamp: 1710003600, open: 2, high: 4, low: 1, close: 3 },
      ],
    })
    expect(response.headers['cache-control']).toContain('max-age=30')
    expect(response.headers['access-control-allow-origin']).toBe('https://swap.cow.fi')

    const request = mockedFetch.mock.calls[0]
    expect(request?.[0]).toContain('GetTokenHistoryOHLC')
    expect(request?.[1]?.headers).toEqual(expect.objectContaining({ 'Connect-Protocol-Version': '1' }))
    expect(JSON.parse(String(request?.[1]?.body))).toEqual({
      singleChain: { chainId: 1, address: TOKEN_ADDRESS },
      startTime: '2024-03-09T16:00:00.000Z',
      endTime: '2024-03-09T18:00:00.000Z',
      resolution: 'OHLC_RESOLUTION_ONE_HOUR',
    })
  })

  it('falls back to Codex after an upstream failure', async () => {
    app = await buildApp()
    mockedFetch.mockResolvedValueOnce(createResponse({}, 500)).mockResolvedValueOnce(
      createResponse({
        data: {
          getTokenBars: {
            o: [1, null],
            h: [3, 4],
            l: [0.5, 1.5],
            c: [2.5, 3.5],
            t: [1710000000, 1710003600],
            volume: ['123.45', null],
          },
        },
      })
    )

    const response = await app.inject({ method: 'GET', url: PRICE_HISTORY_URL })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      providerId: 2,
      bars: [{ timestamp: 1710000000, open: 1, high: 3, low: 0.5, close: 2.5, volume: 123.45 }],
    })
    expect(mockedFetch).toHaveBeenCalledTimes(2)
    expect(mockedFetch.mock.calls[1]?.[0]).toBe('https://graph.codex.io/graphql')
    expect(mockedFetch.mock.calls[1]?.[1]?.headers).toEqual(expect.objectContaining({ Authorization: 'test-api-key' }))
  })

  it('skips the upstream for unsupported intervals', async () => {
    app = await buildApp()
    mockedFetch.mockResolvedValue(createResponse({ data: { getTokenBars: { o: [], h: [], l: [], c: [], t: [] } } }))

    const response = await app.inject({
      method: 'GET',
      url: `/1/tokens/${TOKEN_ADDRESS}/priceHistory?from=1710000000&to=1710007200&interval=15m`,
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ providerId: 2, bars: [] })
    expect(mockedFetch).toHaveBeenCalledTimes(1)
    expect(mockedFetch.mock.calls[0]?.[0]).toBe('https://graph.codex.io/graphql')
  })

  it('rejects inverted time ranges before calling a provider', async () => {
    app = await buildApp()

    const response = await app.inject({
      method: 'GET',
      url: `/1/tokens/${TOKEN_ADDRESS}/priceHistory?from=1710007200&to=1710000000&interval=1h`,
    })

    expect(response.statusCode).toBe(400)
    expect(mockedFetch).not.toHaveBeenCalled()
  })

  it.each([
    `/999999/tokens/${TOKEN_ADDRESS}/priceHistory?from=1710000000&to=1710007200&interval=1h`,
    '/1/tokens/not-an-address/priceHistory?from=1710000000&to=1710007200&interval=1h',
    `/1/tokens/${TOKEN_ADDRESS}/priceHistory?from=1710000000&to=1710007200&interval=30m`,
    `/1/tokens/${TOKEN_ADDRESS}/priceHistory?from=1710000000&to=1710007200&interval=1h&countback=0`,
    `/1/tokens/${TOKEN_ADDRESS}/priceHistory?from=1710000000&interval=1h`,
  ])('rejects invalid route input: %s', async (url) => {
    app = await buildApp()

    expect((await app.inject({ method: 'GET', url })).statusCode).toBe(400)
    expect(mockedFetch).not.toHaveBeenCalled()
  })

  it('returns a generic error when all providers fail', async () => {
    app = await buildApp()
    mockedFetch.mockResolvedValue(createResponse({}, 500))

    const response = await app.inject({ method: 'GET', url: PRICE_HISTORY_URL })

    expect(response.statusCode).toBe(502)
    expect(response.json()).toEqual({ message: 'Price history providers failed' })
  })

  it('returns a generic error when no provider supports the request', async () => {
    app = await buildApp('', '1')

    const response = await app.inject({
      method: 'GET',
      url: `/1/tokens/${TOKEN_ADDRESS}/priceHistory?from=1710000000&to=1710007200&interval=15m`,
    })

    expect(response.statusCode).toBe(502)
    expect(response.json()).toEqual({ message: 'Price history providers failed' })
    expect(mockedFetch).not.toHaveBeenCalled()
  })

  it.each(['', '1,1', '1,x', '3'])('rejects malformed provider order %p during startup', async (order) => {
    await expect(buildApp('test-api-key', order)).rejects.toThrow()
  })
})
