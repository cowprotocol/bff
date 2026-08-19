import { CacheRepository } from '../repos/CacheRepository/CacheRepository'
import {
  createConnectToken,
  invalidateConnectToken,
  lookupConnectToken,
  resolveConnectToken,
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
}

describe('telegramConnectToken', () => {
  describe('resolveConnectToken', () => {
    it('resolves a freshly created token back to its account', async () => {
      const cacheRepository = new TestCacheRepository()

      const token = await createConnectToken(cacheRepository, '0xabc')
      const resolved = await resolveConnectToken(cacheRepository, token)

      expect(resolved).toBe('0xabc')
    })

    it('resolving a token deletes it (single-use)', async () => {
      const cacheRepository = new TestCacheRepository()
      const token = await createConnectToken(cacheRepository, '0xabc')

      await resolveConnectToken(cacheRepository, token)
      const secondResolve = await resolveConnectToken(cacheRepository, token)

      expect(secondResolve).toBeNull()
    })

    it('returns null for an unknown token', async () => {
      const cacheRepository = new TestCacheRepository()

      const resolved = await resolveConnectToken(cacheRepository, 'does-not-exist')

      expect(resolved).toBeNull()
    })
  })

  it('creates tokens that are unique across calls', async () => {
    const cacheRepository = new TestCacheRepository()

    const tokenA = await createConnectToken(cacheRepository, '0xabc')
    const tokenB = await createConnectToken(cacheRepository, '0xabc')

    expect(tokenA).not.toBe(tokenB)
  })

  it('lookupConnectToken does not invalidate the token', async () => {
    const cacheRepository = new TestCacheRepository()
    const token = await createConnectToken(cacheRepository, '0xabc')

    await lookupConnectToken(cacheRepository, token)
    const secondLookup = await lookupConnectToken(cacheRepository, token)

    expect(secondLookup).toBe('0xabc')
  })

  it('invalidateConnectToken makes a later lookup falsy (callers treat it as invalid)', async () => {
    const cacheRepository = new TestCacheRepository()
    const token = await createConnectToken(cacheRepository, '0xabc')

    await invalidateConnectToken(cacheRepository, token)

    expect(await lookupConnectToken(cacheRepository, token)).toBeFalsy()
  })
})
