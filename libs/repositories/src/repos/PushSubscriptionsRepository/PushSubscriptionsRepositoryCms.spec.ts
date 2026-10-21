import { PAGE_SIZE, PushSubscriptionsRepositoryCms } from './PushSubscriptionsRepositoryCms'

// Keep the real openapi-fetch client (the bug was in how it serialises the query string),
// but build it here so the tests don't depend on CMS_* being set before module load.
jest.mock('../../datasources/cms', () => {
  const { CmsClient } = jest.requireActual('@cowprotocol/cms')
  return { getCmsClient: () => CmsClient({ url: 'https://cms.mock/api', apiKey: 'mock-api-key' }) }
})

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

    it('passes a timeout-backed AbortSignal so the request cannot hang indefinitely', async () => {
      mockedFetch.mockResolvedValue(jsonResponse(200, { success: true }))
      const repository = new PushSubscriptionsRepositoryCms()

      await repository.linkTelegramSubscription({ account: '0xabc', chatId: 42 })

      expect(mockedFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      )
    })
  })

  describe('unlinkTelegramSubscription', () => {
    it('POSTs to /telegram-subscription/unlink-via-bot', async () => {
      mockedFetch.mockResolvedValue(jsonResponse(200, { success: true }))
      const repository = new PushSubscriptionsRepositoryCms()

      await repository.unlinkTelegramSubscription({ account: '0xabc', chatId: 42 })

      expect(mockedFetch).toHaveBeenCalledWith(
        'https://cms.mock/telegram-subscription/unlink-via-bot',
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ account: '0xabc', chatId: 42 }) })
      )
    })
  })

  describe('getTelegramSubscriptionsForChatId', () => {
    it('POSTs to /telegram-subscription/accounts-by-chat-via-bot and returns the parsed accounts', async () => {
      mockedFetch.mockResolvedValue(jsonResponse(200, [{ account: '0xabc', chatId: '42' }]))
      const repository = new PushSubscriptionsRepositoryCms()

      const result = await repository.getTelegramSubscriptionsForChatId(42)

      expect(mockedFetch).toHaveBeenCalledWith(
        'https://cms.mock/telegram-subscription/accounts-by-chat-via-bot',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer mock-api-key' }),
          body: JSON.stringify({ chatId: 42 }),
        })
      )
      expect(result).toEqual([{ account: '0xabc', chatId: '42' }])
    })

    it('throws when the cms responds with a non-2xx status', async () => {
      mockedFetch.mockResolvedValue(jsonResponse(500, { error: 'boom' }))
      const repository = new PushSubscriptionsRepositoryCms()

      await expect(repository.getTelegramSubscriptionsForChatId(42)).rejects.toThrow(/500/)
    })
  })

  function accounts(count: number, prefix = '0xacc'): string[] {
    return Array.from({ length: count }, (_, index) => `${prefix}${index}`)
  }

  /**
   * Fake Strapi list endpoint: offset is `(page - 1) * pageSize` and page is clamped to at least 1,
   * like `core-api/service/pagination` in Strapi 4.26.1. Returns the URLs it was asked for.
   */
  function mockStrapiList(rows: Array<string | undefined>): URL[] {
    const requested: URL[] = []

    mockedFetch.mockImplementation(async (input) => {
      const url = new URL((input as Request).url)
      requested.push(url)

      const page = Math.max(1, Number(url.searchParams.get('pagination[page]') ?? 1))
      const pageSize = Number(url.searchParams.get('pagination[pageSize]') ?? 25)
      const start = (page - 1) * pageSize
      const data = rows.slice(start, start + pageSize).map((account, index) => ({
        id: start + index + 1,
        attributes: { account },
      }))

      return new Response(JSON.stringify({ data, meta: {} }), { status: 200 })
    })

    return requested
  }

  describe('getAllSubscribedAccounts', () => {
    it('sends the pagination and sort params as a query string', async () => {
      const requested = mockStrapiList(accounts(1))

      await new PushSubscriptionsRepositoryCms().getAllSubscribedAccounts()

      expect(requested).toHaveLength(1)
      expect(requested[0].pathname).toBe('/api/telegram-subscriptions')
      expect(requested[0].searchParams.get('pagination[page]')).toBe('1')
      expect(requested[0].searchParams.get('pagination[pageSize]')).toBe(String(PAGE_SIZE))
      expect(requested[0].searchParams.get('sort')).toBe('id:asc')
    })

    it('walks every page when there are more subscriptions than fit in one', async () => {
      // Exactly three pages at any page size: two full, then a short one
      const total = PAGE_SIZE * 2 + 1
      const requested = mockStrapiList(accounts(total))

      const result = await new PushSubscriptionsRepositoryCms().getAllSubscribedAccounts()

      expect(result).toHaveLength(total)
      expect(result).toEqual(accounts(total))
      expect(requested.map((url) => url.searchParams.get('pagination[page]'))).toEqual(['1', '2', '3'])
    })

    it('fetches one extra (empty) page when the total is an exact multiple of the page size', async () => {
      const requested = mockStrapiList(accounts(PAGE_SIZE * 2))

      const result = await new PushSubscriptionsRepositoryCms().getAllSubscribedAccounts()

      expect(result).toHaveLength(PAGE_SIZE * 2)
      expect(requested).toHaveLength(3)
    })

    it('makes a single request when there is less than a full page', async () => {
      const requested = mockStrapiList(accounts(PAGE_SIZE - 1))

      const result = await new PushSubscriptionsRepositoryCms().getAllSubscribedAccounts()

      expect(result).toHaveLength(PAGE_SIZE - 1)
      expect(requested).toHaveLength(1)
    })

    it('keeps paging when a full page has rows without an account', async () => {
      // Rows without an account are dropped, but they still take up a slot in the page
      const firstPage: Array<string | undefined> = accounts(PAGE_SIZE)
      firstPage[firstPage.length - 1] = undefined
      const requested = mockStrapiList([...firstPage, '0xlast'])

      const result = await new PushSubscriptionsRepositoryCms().getAllSubscribedAccounts()

      expect(result).toHaveLength(PAGE_SIZE)
      expect(result).toContain('0xlast')
      expect(requested).toHaveLength(2)
    })

    it('lowercases and de-duplicates accounts', async () => {
      mockStrapiList(['0xABC', '0xabc', '0xDeF'])

      const result = await new PushSubscriptionsRepositoryCms().getAllSubscribedAccounts()

      expect(result).toEqual(['0xabc', '0xdef'])
    })

    it('throws instead of looping forever when the cms never returns a short page', async () => {
      mockedFetch.mockImplementation(async () => {
        const data = accounts(PAGE_SIZE).map((account, id) => ({ id, attributes: { account } }))
        return new Response(JSON.stringify({ data, meta: {} }), { status: 200 })
      })

      await expect(new PushSubscriptionsRepositoryCms().getAllSubscribedAccounts()).rejects.toThrow(/pages/)
    })
  })

  describe('getAllTelegramSubscriptionsForAccounts', () => {
    it('makes exactly one request, since the cms endpoint ignores pagination', async () => {
      const subscriptions = accounts(150).map((account) => ({ account, chatId: '42' }))
      mockedFetch.mockImplementation(async () => new Response(JSON.stringify(subscriptions), { status: 200 }))

      const result = await new PushSubscriptionsRepositoryCms().getAllTelegramSubscriptionsForAccounts(['0xabc'])

      expect(result).toHaveLength(150)
      expect(mockedFetch).toHaveBeenCalledTimes(1)
      expect(new URL((mockedFetch.mock.calls[0][0] as Request).url).pathname).toBe(
        '/api/accounts/0xabc/subscriptions/telegram'
      )
    })
  })
})
