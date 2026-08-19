import { PushSubscriptionsRepositoryCms } from './PushSubscriptionsRepositoryCms'

global.fetch = jest.fn()

const mockedFetch = fetch as jest.MockedFunction<typeof fetch>

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return JSON.stringify(body)
    },
  } as unknown as Response
}

describe('PushSubscriptionsRepositoryCms', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    jest.resetAllMocks()
    process.env = { ...OLD_ENV, CMS_BASE_URL: 'https://cms.mock', CMS_API_KEY: 'mock-api-key' }
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  describe('linkTelegramSubscription', () => {
    it('POSTs to /telegram-subscription/link-via-bot with a bearer token', async () => {
      mockedFetch.mockResolvedValue(jsonResponse(200, { success: true }))
      const repository = new PushSubscriptionsRepositoryCms()

      await repository.linkTelegramSubscription({ account: '0xabc', chatId: 42, username: 'alice' })

      expect(mockedFetch).toHaveBeenCalledWith(
        'https://cms.mock/telegram-subscription/link-via-bot',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer mock-api-key' }),
          body: JSON.stringify({ account: '0xabc', chatId: 42, username: 'alice' }),
        })
      )
    })

    it('throws when the cms responds with a non-2xx status', async () => {
      mockedFetch.mockResolvedValue(jsonResponse(500, { error: 'boom' }))
      const repository = new PushSubscriptionsRepositoryCms()

      await expect(repository.linkTelegramSubscription({ account: '0xabc', chatId: 42 })).rejects.toThrow(/500/)
    })
  })

  describe('unlinkTelegramSubscription', () => {
    it('POSTs to /telegram-subscription/unlink-via-bot', async () => {
      mockedFetch.mockResolvedValue(jsonResponse(200, { success: true }))
      const repository = new PushSubscriptionsRepositoryCms()

      await repository.unlinkTelegramSubscription({ account: '0xabc' })

      expect(mockedFetch).toHaveBeenCalledWith(
        'https://cms.mock/telegram-subscription/unlink-via-bot',
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ account: '0xabc' }) })
      )
    })
  })
})
