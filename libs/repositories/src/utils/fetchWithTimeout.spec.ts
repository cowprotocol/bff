import { fetchWithTimeout } from './fetchWithTimeout'

describe('fetchWithTimeout', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('aborts a call that outlives the timeout', async () => {
    // A hung upstream: resolves only when the signal aborts
    global.fetch = jest.fn((_input, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))
      })
    }) as unknown as typeof fetch

    await expect(fetchWithTimeout(20)('https://example.test')).rejects.toMatchObject({ name: 'TimeoutError' })
  })

  it('leaves a call that finishes in time alone', async () => {
    global.fetch = jest.fn(async () => new Response('ok')) as unknown as typeof fetch

    await expect(fetchWithTimeout(1000)('https://example.test')).resolves.toBeInstanceOf(Response)
  })

  it('still honours a caller-supplied signal', async () => {
    global.fetch = jest.fn((_input, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))
      })
    }) as unknown as typeof fetch

    const controller = new AbortController()
    const promise = fetchWithTimeout(10_000)('https://example.test', { signal: controller.signal })
    controller.abort(new Error('caller gave up'))

    await expect(promise).rejects.toThrow('caller gave up')
  })
})
