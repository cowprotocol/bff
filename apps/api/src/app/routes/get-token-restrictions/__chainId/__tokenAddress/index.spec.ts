import { SupportedChainId } from '@cowprotocol/cow-sdk'
import Fastify from 'fastify'
import tokenRestrictions from './index'
import { REFRESH_INTERVAL_MS, RESTRICTED_TOKEN_LISTS_URL } from './tokenRestrictions.service'

const XSTOCKS_URL = 'https://example.com/xstocks.json'
const ONDO_URL = 'https://example.com/ondo.json'
const BROKEN_URL = 'https://example.com/broken.json'

const XSTOCK_TOKEN = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
const ONDO_TOKEN = '0x1111111111111111111111111111111111111111'
const OTHER_TOKEN = '0x2222222222222222222222222222222222222222'
const SOLANA_MINT = 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm'

const CMS_RESPONSE = {
  data: [
    {
      id: 2,
      attributes: { name: 'xStocks Token List', tokenListUrl: XSTOCKS_URL, restrictedCountries: ['US', 'CA'] },
    },
    {
      id: 1,
      attributes: { name: 'Ondo Tokenized Stocks List', tokenListUrl: ONDO_URL, restrictedCountries: ['GB'] },
    },
    {
      id: 3,
      attributes: { name: 'Broken List', tokenListUrl: BROKEN_URL, restrictedCountries: ['US'] },
    },
  ],
}

const TOKEN_LISTS: Record<string, unknown> = {
  [XSTOCKS_URL]: {
    tokens: [
      { chainId: 1, address: XSTOCK_TOKEN.toLowerCase() },
      { chainId: SupportedChainId.SOLANA, address: SOLANA_MINT },
      // Unsupported chain, must be ignored
      { chainId: 999999, address: OTHER_TOKEN },
    ],
  },
  [ONDO_URL]: { tokens: [{ chainId: 1, address: ONDO_TOKEN }] },
}

function jsonResponse(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: async () => body }
}

function mockFetch(cmsResponse: unknown = CMS_RESPONSE) {
  return jest.fn(async (url: string) => {
    if (url === RESTRICTED_TOKEN_LISTS_URL) return jsonResponse(cmsResponse)
    if (url === BROKEN_URL) return jsonResponse({}, false)
    if (url in TOKEN_LISTS) return jsonResponse(TOKEN_LISTS[url])
    throw new Error(`Unexpected url ${url}`)
  })
}

function url(chainId: number | string, tokenAddress: string, countryCode?: string) {
  const query = countryCode === undefined ? '' : `?countryCode=${countryCode}`
  return `/get-token-restrictions/${chainId}/${tokenAddress}${query}`
}

describe('get-token-restrictions route', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    jest.restoreAllMocks()
  })

  const flushBackgroundRefresh = () => new Promise((resolve) => setTimeout(resolve, 0))

  async function createApp() {
    const app = Fastify()
    await app.register(tokenRestrictions, { prefix: '/get-token-restrictions/:chainId/:tokenAddress' })
    return app
  }

  it('returns the matching list for a restricted token and country', async () => {
    globalThis.fetch = mockFetch() as unknown as typeof fetch
    const app = await createApp()

    const response = await app.inject({ method: 'GET', url: url(1, XSTOCK_TOKEN, 'US') })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ restricted: true, tokenList: 'xStocks Token List' })
    expect(response.headers['cache-control']).toBe('max-age=300, public, s-maxage=300')
    await app.close()
  })

  it('matches country codes case-insensitively', async () => {
    globalThis.fetch = mockFetch() as unknown as typeof fetch
    const app = await createApp()

    const response = await app.inject({ method: 'GET', url: url(1, ONDO_TOKEN, 'gb') })

    expect(response.json()).toEqual({ restricted: true, tokenList: 'Ondo Tokenized Stocks List' })
    await app.close()
  })

  it('matches Solana mints with their original casing', async () => {
    globalThis.fetch = mockFetch() as unknown as typeof fetch
    const app = await createApp()

    const response = await app.inject({ method: 'GET', url: url(SupportedChainId.SOLANA, SOLANA_MINT, 'CA') })

    expect(response.json()).toEqual({ restricted: true, tokenList: 'xStocks Token List' })
    await app.close()
  })

  it.each([
    ['country is not restricted for the list', 1, XSTOCK_TOKEN, 'DE'],
    ['token is on another chain', SupportedChainId.GNOSIS_CHAIN, XSTOCK_TOKEN, 'US'],
    ['token is not in any list', 1, OTHER_TOKEN, 'US'],
  ])('returns restricted: false when %s', async (_, chainId, tokenAddress, countryCode) => {
    globalThis.fetch = mockFetch() as unknown as typeof fetch
    const app = await createApp()

    const response = await app.inject({ method: 'GET', url: url(chainId, tokenAddress, countryCode) })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ restricted: false })
    await app.close()
  })

  it('loads the lists only once', async () => {
    const fetchMock = mockFetch()
    globalThis.fetch = fetchMock as unknown as typeof fetch
    const app = await createApp()

    await app.inject({ method: 'GET', url: url(1, XSTOCK_TOKEN, 'US') })
    await app.inject({ method: 'GET', url: url(1, ONDO_TOKEN, 'GB') })

    // CMS + 3 token lists
    expect(fetchMock).toHaveBeenCalledTimes(4)
    await app.close()
  })

  it.each([
    ['unsupported chain', url(999999, XSTOCK_TOKEN, 'US')],
    ['invalid EVM address', url(1, 'not-an-address', 'US')],
    ['EVM address on Solana', url(SupportedChainId.SOLANA, XSTOCK_TOKEN, 'US')],
    ['missing country code', url(1, XSTOCK_TOKEN)],
    ['invalid country code', url(1, XSTOCK_TOKEN, 'USA')],
  ])('rejects %s', async (_, requestUrl) => {
    globalThis.fetch = mockFetch() as unknown as typeof fetch
    const app = await createApp()

    const response = await app.inject({ method: 'GET', url: requestUrl })

    expect(response.statusCode).toBe(400)
    await app.close()
  })

  it('returns 503 when the CMS has no lists, and retries on the next request', async () => {
    const fetchMock = mockFetch({ data: [] })
    globalThis.fetch = fetchMock as unknown as typeof fetch
    const app = await createApp()

    const failed = await app.inject({ method: 'GET', url: url(1, XSTOCK_TOKEN, 'US') })
    expect(failed.statusCode).toBe(503)

    globalThis.fetch = mockFetch() as unknown as typeof fetch
    const recovered = await app.inject({ method: 'GET', url: url(1, XSTOCK_TOKEN, 'US') })
    expect(recovered.json()).toEqual({ restricted: true, tokenList: 'xStocks Token List' })
    await app.close()
  })

  it('does not set cache-control on 503', async () => {
    globalThis.fetch = mockFetch({ data: [] }) as unknown as typeof fetch
    const app = await createApp()

    const response = await app.inject({ method: 'GET', url: url(1, XSTOCK_TOKEN, 'US') })

    expect(response.statusCode).toBe(503)
    expect(response.headers['cache-control']).toBeUndefined()
    await app.close()
  })

  it('refetches the lists at most once per refresh interval, in the background', async () => {
    let now = 1_000_000
    jest.spyOn(Date, 'now').mockImplementation(() => now)
    const fetchMock = mockFetch()
    globalThis.fetch = fetchMock as unknown as typeof fetch
    const app = await createApp()

    await app.inject({ method: 'GET', url: url(1, XSTOCK_TOKEN, 'US') })
    expect(fetchMock).toHaveBeenCalledTimes(4)

    now += REFRESH_INTERVAL_MS - 1
    await app.inject({ method: 'GET', url: url(1, XSTOCK_TOKEN, 'US') })
    await flushBackgroundRefresh()
    expect(fetchMock).toHaveBeenCalledTimes(4)

    // The CMS now drops xStocks: the stale registry is served, then replaced by the refreshed one
    const refreshedFetch = mockFetch({ data: [CMS_RESPONSE.data[1]] })
    globalThis.fetch = refreshedFetch as unknown as typeof fetch
    now += 1
    const stale = await app.inject({ method: 'GET', url: url(1, XSTOCK_TOKEN, 'US') })
    expect(stale.json()).toEqual({ restricted: true, tokenList: 'xStocks Token List' })
    await flushBackgroundRefresh()

    const fresh = await app.inject({ method: 'GET', url: url(1, XSTOCK_TOKEN, 'US') })
    expect(fresh.json()).toEqual({ restricted: false })
    expect(refreshedFetch).toHaveBeenCalledTimes(2)
    await app.close()
  })

  it('keeps the current registry when a refresh fails', async () => {
    let now = 1_000_000
    jest.spyOn(Date, 'now').mockImplementation(() => now)
    globalThis.fetch = mockFetch() as unknown as typeof fetch
    const app = await createApp()
    await app.inject({ method: 'GET', url: url(1, XSTOCK_TOKEN, 'US') })

    const failingFetch = jest.fn().mockRejectedValue(new Error('CMS is down'))
    globalThis.fetch = failingFetch as unknown as typeof fetch
    now += REFRESH_INTERVAL_MS
    await app.inject({ method: 'GET', url: url(1, XSTOCK_TOKEN, 'US') })
    await flushBackgroundRefresh()

    const response = await app.inject({ method: 'GET', url: url(1, XSTOCK_TOKEN, 'US') })
    expect(response.json()).toEqual({ restricted: true, tokenList: 'xStocks Token List' })
    // Failed refresh is throttled too
    expect(failingFetch).toHaveBeenCalledTimes(1)
    await app.close()
  })

  it('keeps previously loaded tokens of a list that fails to refresh', async () => {
    let now = 1_000_000
    jest.spyOn(Date, 'now').mockImplementation(() => now)
    globalThis.fetch = mockFetch() as unknown as typeof fetch
    const app = await createApp()
    await app.inject({ method: 'GET', url: url(1, XSTOCK_TOKEN, 'US') })

    const base = mockFetch()
    globalThis.fetch = jest.fn(async (requestUrl: string) =>
      requestUrl === XSTOCKS_URL ? jsonResponse({}, false) : base(requestUrl)
    ) as unknown as typeof fetch
    now += REFRESH_INTERVAL_MS
    await app.inject({ method: 'GET', url: url(1, XSTOCK_TOKEN, 'US') })
    await flushBackgroundRefresh()

    const response = await app.inject({ method: 'GET', url: url(1, XSTOCK_TOKEN, 'US') })
    expect(response.json()).toEqual({ restricted: true, tokenList: 'xStocks Token List' })
    await app.close()
  })

  it('returns the first matching list in CMS order, regardless of fetch timing', async () => {
    const first = { name: 'First', tokenListUrl: XSTOCKS_URL, restrictedCountries: ['US'] }
    const second = { name: 'Second', tokenListUrl: ONDO_URL, restrictedCountries: ['US'] }
    const tokens = { tokens: [{ chainId: 1, address: XSTOCK_TOKEN }] }
    globalThis.fetch = jest.fn(async (requestUrl: string) => {
      if (requestUrl === RESTRICTED_TOKEN_LISTS_URL) {
        return jsonResponse({ data: [{ attributes: first }, { attributes: second }] })
      }
      // The first list resolves last
      if (requestUrl === XSTOCKS_URL) await new Promise((resolve) => setTimeout(resolve, 10))
      return jsonResponse(tokens)
    }) as unknown as typeof fetch
    const app = await createApp()

    const response = await app.inject({ method: 'GET', url: url(1, XSTOCK_TOKEN, 'US') })

    expect(response.json()).toEqual({ restricted: true, tokenList: 'First' })
    await app.close()
  })
})
