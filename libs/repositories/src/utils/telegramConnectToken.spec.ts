import { Redis } from 'ioredis'

import { CacheRepository } from '../repos/CacheRepository/CacheRepository'
import {
  claimConnectToken,
  CONNECT_TOKEN_RATE_LIMIT,
  CONNECT_TOKEN_RATE_LIMIT_WINDOW_SECONDS,
  createConnectToken,
  isConnectTokenRateLimited,
  releaseConnectToken,
} from './telegramConnectToken'

// Simple in-memory cache implementation for testing
class TestCacheRepository implements CacheRepository {
  private cache = new Map<string, { value: string; expiresAt: number }>()

  async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key)
    if (!entry) return null
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key)
      return null
    }
    return entry.value
  }

  async getTtl(key: string): Promise<number | null> {
    const entry = this.cache.get(key)
    if (!entry) return null
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key)
      return null
    }
    return Math.ceil((entry.expiresAt - Date.now()) / 1000)
  }

  async set(key: string, value: string, ttl: number): Promise<void> {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl * 1000,
    })
  }

  async take(key: string): Promise<string | null> {
    // No internal await: get+delete must complete synchronously in one microtask so this
    // mock exercises the same single-winner guarantee the real Redis/node-cache take() gives.
    const entry = this.cache.get(key)
    this.cache.delete(key)

    if (!entry || entry.expiresAt < Date.now()) return null

    return entry.value
  }
}

describe('telegramConnectToken', () => {
  describe('claimConnectToken', () => {
    it('claims a freshly created token back to its account', async () => {
      const cacheRepository = new TestCacheRepository()

      const token = await createConnectToken(cacheRepository, '0xabc')
      const claimed = await claimConnectToken(cacheRepository, token)

      expect(claimed).toBe('0xabc')
    })

    it('claiming a token deletes it (single-use)', async () => {
      const cacheRepository = new TestCacheRepository()
      const token = await createConnectToken(cacheRepository, '0xabc')

      await claimConnectToken(cacheRepository, token)
      const secondClaim = await claimConnectToken(cacheRepository, token)

      expect(secondClaim).toBeNull()
    })

    it('returns null for an unknown token', async () => {
      const cacheRepository = new TestCacheRepository()

      const claimed = await claimConnectToken(cacheRepository, 'does-not-exist')

      expect(claimed).toBeNull()
    })

    it('only one of two concurrent claims for the same token succeeds', async () => {
      const cacheRepository = new TestCacheRepository()
      const token = await createConnectToken(cacheRepository, '0xabc')

      const [first, second] = await Promise.all([
        claimConnectToken(cacheRepository, token),
        claimConnectToken(cacheRepository, token),
      ])

      expect([first, second].filter((result) => result === '0xabc')).toHaveLength(1)
      expect([first, second].filter((result) => result === null)).toHaveLength(1)
    })
  })

  describe('releaseConnectToken', () => {
    it('restores a claimed token so it can be claimed again', async () => {
      const cacheRepository = new TestCacheRepository()
      const token = await createConnectToken(cacheRepository, '0xabc')

      await claimConnectToken(cacheRepository, token)
      await releaseConnectToken(cacheRepository, token, '0xabc')

      expect(await claimConnectToken(cacheRepository, token)).toBe('0xabc')
    })
  })

  it('creates tokens that are unique across calls', async () => {
    const cacheRepository = new TestCacheRepository()

    const tokenA = await createConnectToken(cacheRepository, '0xabc')
    const tokenB = await createConnectToken(cacheRepository, '0xabc')

    expect(tokenA).not.toBe(tokenB)
  })
})

describe('isConnectTokenRateLimited', () => {
  const KEY = 'telegram-connect-rate:0xabc'

  // Mimics INCR plus EXPIRE ... NX: the expiry only lands while the key has none.
  function buildRedis() {
    const counters = new Map<string, number>()
    const ttls = new Map<string, number>()

    const incr = jest.fn(async (key: string) => {
      const count = (counters.get(key) ?? 0) + 1
      counters.set(key, count)
      return count
    })

    const expire = jest.fn(async (key: string, seconds: number, mode?: string) => {
      if (mode === 'NX' && ttls.has(key)) return 0
      ttls.set(key, seconds)
      return 1
    })

    return { redis: { incr, expire } as unknown as Pick<Redis, 'incr' | 'expire'>, counters, ttls }
  }

  it('allows requests up to the limit and rejects the next one', async () => {
    const { redis } = buildRedis()

    for (let i = 0; i < CONNECT_TOKEN_RATE_LIMIT; i++) {
      expect(await isConnectTokenRateLimited(redis, '0xabc')).toBe(false)
    }

    expect(await isConnectTokenRateLimited(redis, '0xabc')).toBe(true)
  })

  it('does not slide the window on later requests', async () => {
    const { redis, ttls } = buildRedis()

    await isConnectTokenRateLimited(redis, '0xabc')
    ttls.set(KEY, 5) // window about to close

    await isConnectTokenRateLimited(redis, '0xabc')

    expect(ttls.get(KEY)).toBe(5)
  })

  it('restores a missing expiry so a lost EXPIRE cannot lock the account out for good', async () => {
    const { redis, counters, ttls } = buildRedis()
    // A previous request incremented the key but never set a TTL - EXPIRE threw, or the process
    // died between the two commands.
    counters.set(KEY, CONNECT_TOKEN_RATE_LIMIT)

    await isConnectTokenRateLimited(redis, '0xabc')

    expect(ttls.get(KEY)).toBe(CONNECT_TOKEN_RATE_LIMIT_WINDOW_SECONDS)
  })

  it('counts each account separately', async () => {
    const { redis } = buildRedis()

    for (let i = 0; i <= CONNECT_TOKEN_RATE_LIMIT; i++) {
      await isConnectTokenRateLimited(redis, '0xabc')
    }

    expect(await isConnectTokenRateLimited(redis, '0xdef')).toBe(false)
  })
})
