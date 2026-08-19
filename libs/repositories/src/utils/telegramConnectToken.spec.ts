import { CacheRepository } from '../repos/CacheRepository/CacheRepository'
import { claimConnectToken, createConnectToken, releaseConnectToken } from './telegramConnectToken'

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
