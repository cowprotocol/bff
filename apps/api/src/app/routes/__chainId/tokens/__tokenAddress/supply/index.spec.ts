import { SupportedChainId } from '@cowprotocol/cow-sdk'
import Fastify from 'fastify'
import supply from './index'

const TOKEN_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
const URL = `/1/tokens/${TOKEN_ADDRESS}/supply`

describe('token supply route', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  async function createApp() {
    const app = Fastify()
    await app.register(supply, { prefix: '/:chainId/tokens/:tokenAddress/supply' })
    return app
  }

  it('returns token supply metadata', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tokens: {
          [TOKEN_ADDRESS.toLowerCase()]: { circulatingSupply: 120, totalSupply: 150 },
        },
      }),
    })
    globalThis.fetch = fetchMock
    const app = await createApp()

    const response = await app.inject({ method: 'GET', url: URL })
    await app.inject({ method: 'GET', url: URL })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ circulatingSupply: 120, totalSupply: 150 })
    expect(response.headers['cache-control']).toBe('max-age=3600, public, s-maxage=3600')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await app.close()
  })

  it('returns Solana supply using the original mint casing', async () => {
    const mint = 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm'
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ tokens: { [mint]: { circulatingSupply: 120, totalSupply: 150 } } }),
    })
    const app = await createApp()
    const response = await app.inject({
      method: 'GET',
      url: `/${SupportedChainId.SOLANA}/tokens/${mint}/supply`,
    })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ circulatingSupply: 120, totalSupply: 150 })
    await app.close()
  })

  it.each([
    [SupportedChainId.SOLANA, TOKEN_ADDRESS],
    [1, 'So11111111111111111111111111111111111111112'],
    [SupportedChainId.SOLANA, 'invalid-mint'],
  ])('rejects invalid addresses for chain %s', async (chainId, tokenAddress) => {
    const fetchMock = jest.fn()
    globalThis.fetch = fetchMock
    const app = await createApp()
    const response = await app.inject({ method: 'GET', url: `/${chainId}/tokens/${tokenAddress}/supply` })
    expect(response.statusCode).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
    await app.close()
  })

  it('returns 404 when the token is missing', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ tokens: {} }) })
    const app = await createApp()

    const response = await app.inject({ method: 'GET', url: URL })

    expect(response.statusCode).toBe(404)
    await app.close()
  })

  it('returns 502 for an invalid upstream response', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tokens: {
          [TOKEN_ADDRESS.toLowerCase()]: { circulatingSupply: 'invalid', totalSupply: 150 },
        },
      }),
    })
    const app = await createApp()

    const response = await app.inject({ method: 'GET', url: URL })

    expect(response.statusCode).toBe(502)
    await app.close()
  })
})
