import { CacheRepository } from '@cowprotocol/repositories'
import { parseStartCommand, handleStartCommand } from './startCommand'

// Simple in-memory cache implementation for testing.
//
// Not imported from '@cowprotocol/repositories' (CacheRepositoryMemory) because that barrel
// transitively pulls in node-fetch (pure ESM) via PushSubscriptionsRepositoryCms, which breaks
// under this repo's Jest/ts-jest. See apps/api's connectToken.spec.ts for the same pattern.
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
    const entry = this.cache.get(key)
    this.cache.delete(key)

    if (!entry || entry.expiresAt < Date.now()) return null

    return entry.value
  }
}

describe('parseStartCommand', () => {
  it('extracts the token from "/start <token>"', () => {
    expect(parseStartCommand('/start abc123')).toBe('abc123')
  })

  it('returns null for plain "/start" with no token', () => {
    expect(parseStartCommand('/start')).toBeNull()
  })

  it('returns null for unrelated messages', () => {
    expect(parseStartCommand('hello there')).toBeNull()
  })

  it('returns null for undefined text', () => {
    expect(parseStartCommand(undefined)).toBeNull()
  })
})

describe('handleStartCommand', () => {
  function buildMsg(text: string) {
    return {
      text,
      chat: { id: 555 },
      from: { first_name: 'Ada', username: 'ada' },
    } as import('node-telegram-bot-api').Message
  }

  it('links the subscription and confirms when the token is valid', async () => {
    const cacheRepository = new TestCacheRepository()
    await cacheRepository.set('telegram-connect:abc123', '0xabc', 600)
    const linkTelegramSubscription = jest.fn().mockResolvedValue(undefined)
    const pushSubscriptionsRepository = { linkTelegramSubscription } as any
    const sendMessage = jest.fn()
    const bot = { sendMessage } as any

    await handleStartCommand({ bot, msg: buildMsg('/start abc123'), cacheRepository, pushSubscriptionsRepository })

    expect(linkTelegramSubscription).toHaveBeenCalledWith({
      account: '0xabc',
      chatId: 555,
      firstName: 'Ada',
      username: 'ada',
    })
    expect(sendMessage).toHaveBeenCalledWith(
      555,
      expect.stringMatching(/connected/i),
      expect.objectContaining({
        reply_markup: expect.objectContaining({ inline_keyboard: expect.any(Array) }),
      })
    )
  })

  it('replies with an expired-link message when the token is unknown', async () => {
    const cacheRepository = new TestCacheRepository()
    const linkTelegramSubscription = jest.fn()
    const pushSubscriptionsRepository = { linkTelegramSubscription } as any
    const sendMessage = jest.fn()
    const bot = { sendMessage } as any

    await handleStartCommand({
      bot,
      msg: buildMsg('/start does-not-exist'),
      cacheRepository,
      pushSubscriptionsRepository,
    })

    expect(linkTelegramSubscription).not.toHaveBeenCalled()
    expect(sendMessage).toHaveBeenCalledWith(555, expect.stringMatching(/expired/i))
  })

  it('replies with a generic error and keeps the token valid when linking fails', async () => {
    const cacheRepository = new TestCacheRepository()
    await cacheRepository.set('telegram-connect:abc123', '0xabc', 600)
    const linkTelegramSubscription = jest.fn().mockRejectedValue(new Error('CMS write failed'))
    const pushSubscriptionsRepository = { linkTelegramSubscription } as any
    const sendMessage = jest.fn()
    const bot = { sendMessage } as any

    await handleStartCommand({ bot, msg: buildMsg('/start abc123'), cacheRepository, pushSubscriptionsRepository })

    expect(linkTelegramSubscription).toHaveBeenCalledWith({
      account: '0xabc',
      chatId: 555,
      firstName: 'Ada',
      username: 'ada',
    })
    expect(sendMessage).toHaveBeenCalledWith(555, expect.stringMatching(/something went wrong/i))

    // The token must NOT have been invalidated, so the same token can be retried.
    expect(await cacheRepository.get('telegram-connect:abc123')).toBe('0xabc')
  })

  it('ignores non-/start messages', async () => {
    const cacheRepository = new TestCacheRepository()
    const linkTelegramSubscription = jest.fn()
    const pushSubscriptionsRepository = { linkTelegramSubscription } as any
    const sendMessage = jest.fn()
    const bot = { sendMessage } as any

    await handleStartCommand({ bot, msg: buildMsg('hi'), cacheRepository, pushSubscriptionsRepository })

    expect(linkTelegramSubscription).not.toHaveBeenCalled()
    expect(sendMessage).not.toHaveBeenCalled()
  })
})
