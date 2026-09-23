import '@fastify/swagger' // pulls in the FastifySchema augmentation the route's `description` relies on
import Fastify from 'fastify'

const ACCOUNT = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
const URL = `/accounts/${ACCOUNT}/telegram/connect-token`

const mockCreateConnectToken = jest.fn()
const mockGetConnectTokenRetryAfter = jest.fn()

jest.mock('@cowprotocol/repositories', () => ({
  isCmsEnabled: true,
  redisClient: { incr: jest.fn(), expire: jest.fn(), ttl: jest.fn() },
  cacheRepositorySymbol: Symbol.for('CacheRepository'),
  pushSubscriptionsRepositorySymbol: Symbol.for('PushSubscriptionsRepository'),
  createConnectToken: (...args: unknown[]) => mockCreateConnectToken(...args),
  getConnectTokenRetryAfter: (...args: unknown[]) => mockGetConnectTokenRetryAfter(...args),
}))

jest.mock('../../../../inversify.config', () => ({
  apiContainer: { get: () => ({}) },
}))

jest.mock('node-telegram-bot-api', () =>
  jest.fn().mockImplementation(() => ({ getMe: async () => ({ username: 'cow_bot' }) }))
)

// eslint-disable-next-line @typescript-eslint/no-var-requires
const telegram = require('./index').default

describe('telegram connect-token route', () => {
  beforeAll(() => {
    process.env.TELEGRAM_SECRET = 'test-secret'
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateConnectToken.mockResolvedValue('token-123')
  })

  async function createApp() {
    const app = Fastify()
    await app.register(telegram, { prefix: '/accounts/:account/telegram' })
    return app
  }

  it('mints a token when the account is under the rate limit', async () => {
    mockGetConnectTokenRetryAfter.mockResolvedValue(null)
    const app = await createApp()

    const response = await app.inject({ method: 'POST', url: URL })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ token: 'token-123', deepLink: 'https://t.me/cow_bot?start=token-123' })
    // The rate limiter is keyed on the normalised account, not the casing the caller sent.
    expect(mockGetConnectTokenRetryAfter).toHaveBeenCalledWith(expect.anything(), ACCOUNT.toLowerCase())
    await app.close()
  })

  it('returns 429 with the remaining window as Retry-After and mints nothing', async () => {
    mockGetConnectTokenRetryAfter.mockResolvedValue(17)
    const app = await createApp()

    const response = await app.inject({ method: 'POST', url: URL })

    expect(response.statusCode).toBe(429)
    expect(response.headers['retry-after']).toBe('17')
    expect(mockCreateConnectToken).not.toHaveBeenCalled()
    await app.close()
  })
})
