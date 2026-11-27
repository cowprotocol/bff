import Fastify, { FastifyInstance } from 'fastify'
import { priceHistoryQuerySchema } from '../routes/__chainId/tokens/__tokenAddress/priceHistory/priceHistory.schemas'

const mockStore = new Map<string, string>()

jest.mock('../inversify.config', () => ({
  apiContainer: {
    get: () => ({
      get: async (key: string) => mockStore.get(key) ?? null,
      set: async (key: string, value: string) => {
        mockStore.set(key, value)
      },
      getTtl: async (key: string) => (mockStore.has(key) ? 30 : null),
      take: async (key: string) => {
        const value = mockStore.get(key) ?? null
        mockStore.delete(key)
        return value
      },
    }),
  },
}))

const VALID = 'from=1795621551&to=1795621800&interval=5m'

async function build(): Promise<FastifyInstance> {
  const app = Fastify()
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  await app.register(require('./bffCache').default)

  app.get<{ Querystring: { from: number; to: number } }>(
    '/bars',
    { config: { cacheKeyTimestampParams: ['from', 'to'] }, schema: { querystring: priceHistoryQuerySchema } },
    async (_request, reply) => {
      reply.header('cache-control', 'max-age=30, public, s-maxage=30')
      return { bars: [1] }
    }
  )
  await app.ready()
  return app
}

describe('bffCache', () => {
  beforeEach(() => mockStore.clear())

  it('serves a repeated request from the cache', async () => {
    const app = await build()

    expect((await app.inject({ method: 'GET', url: `/bars?${VALID}` })).headers['x-bff-cache']).toBe('MISS')
    expect((await app.inject({ method: 'GET', url: `/bars?${VALID}` })).headers['x-bff-cache']).toBe('HIT')

    await app.close()
  })

  it('still rejects a malformed request whose key normalises onto a warm one', async () => {
    const app = await build()
    await app.inject({ method: 'GET', url: `/bars?${VALID}` })

    // Same 30s buckets as VALID, so these share its cache key. The lookup runs after validation,
    // so the schema gets to reject them instead of the warm entry answering.
    for (const query of ['from=1795621551&from=bad&to=1795621800&interval=5m', `${VALID}&to=2147483650`]) {
      expect((await app.inject({ method: 'GET', url: `/bars?${query}` })).statusCode).toBe(400)
    }

    await app.close()
  })
})
