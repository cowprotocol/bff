import Fastify, { FastifyInstance } from 'fastify'
import pino from 'pino'
import { Writable } from 'stream'
import { FAILURES_BEFORE_BLOCKING, registerProxy } from './registerProxy'

const UNREACHABLE = 'http://127.0.0.1:1'

async function startUpstream(handler: (reply: import('fastify').FastifyReply) => void): Promise<FastifyInstance> {
  const upstream = Fastify()
  upstream.get('/*', async (_request, reply) => handler(reply))
  await upstream.listen({ port: 0, host: '127.0.0.1' })

  return upstream
}

function upstreamUrl(upstream: FastifyInstance): string {
  const address = upstream.server.address()

  if (address === null || typeof address === 'string') throw new Error('expected a TCP address')

  return `http://127.0.0.1:${address.port}`
}

/** Captures what the app actually writes, so assertions are on emitted lines rather than intent. */
function captureLogs(): { lines: Record<string, unknown>[]; logger: pino.Logger } {
  const lines: Record<string, unknown>[] = []
  const sink = new Writable({
    write(chunk, _enc, cb) {
      chunk
        .toString()
        .split('\n')
        .filter(Boolean)
        .forEach((line: string) => lines.push(JSON.parse(line)))
      cb()
    },
  })

  return { lines, logger: pino({ level: 'info' }, sink) }
}

describe('registerProxy', () => {
  // The failure memory is keyed by proxy name and the cache is shared, so each test needs its own
  let proxyName = ''
  beforeEach(() => {
    proxyName = `test-${Math.random().toString(36).slice(2)}`
  })

  it('forwards a successful call', async () => {
    const upstream = await startUpstream((reply) => reply.send({ ok: true }))
    const app = Fastify()
    await registerProxy(app, { name: proxyName, upstream: upstreamUrl(upstream) })

    const response = await app.inject({ method: 'GET', url: '/' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ ok: true })

    await app.close()
    await upstream.close()
  })

  it.each([
    [200, 'a success'],
    [503, 'an upstream error'],
  ])('logs the upstream response with status %s (%s)', async (status) => {
    const upstream = await startUpstream((reply) => reply.code(status).send({ ok: status === 200 }))
    const { lines, logger } = captureLogs()
    const app = Fastify({ logger })
    await registerProxy(app, { name: proxyName, upstream: upstreamUrl(upstream) })

    await app.inject({ method: 'GET', url: '/thing' })

    const proxied = lines.find((line) => line.msg === `Proxied to ${proxyName}`)

    // The status in particular: the hook's third argument is the body stream, so reading statusCode
    // off it yields undefined and pino drops the field entirely, without any error.
    expect(proxied).toMatchObject({ proxy: proxyName, url: '/thing', method: 'GET', status })
    expect(proxied).toHaveProperty('ms', expect.any(Number))
    expect(proxied).toHaveProperty('reqId')

    await app.close()
    await upstream.close()
  })

  it('logs a transport failure', async () => {
    const { lines, logger } = captureLogs()
    const app = Fastify({ logger })
    await registerProxy(app, { name: proxyName, upstream: UNREACHABLE })

    await app.inject({ method: 'GET', url: '/thing' })

    const failed = lines.find((line) => line.msg === `Proxy to ${proxyName} failed`)
    expect(failed).toMatchObject({ proxy: proxyName, url: '/thing', level: 50 })
    expect(failed).toHaveProperty('err', expect.any(String))

    await app.close()
  })

  describe('response body', () => {
    it('logs the body of a failing response by default, and forwards it intact', async () => {
      const upstream = await startUpstream((reply) => reply.code(502).send({ why: 'upstream exploded' }))
      const { lines, logger } = captureLogs()
      const app = Fastify({ logger })
      await registerProxy(app, { name: proxyName, upstream: upstreamUrl(upstream) })

      const response = await app.inject({ method: 'GET', url: '/thing' })

      // The client still gets the whole body: the tap passes through, it does not consume
      expect(response.json()).toEqual({ why: 'upstream exploded' })

      const proxied = lines.find((line) => line.msg === `Proxied to ${proxyName}`)
      expect(proxied).toMatchObject({ status: 502, body: JSON.stringify({ why: 'upstream exploded' }) })
      expect(proxied).toHaveProperty('bytes', expect.any(Number))

      await app.close()
      await upstream.close()
    })

    it('does not log the body of a successful response by default', async () => {
      const upstream = await startUpstream((reply) => reply.send({ big: 'payload' }))
      const { lines, logger } = captureLogs()
      const app = Fastify({ logger })
      await registerProxy(app, { name: proxyName, upstream: upstreamUrl(upstream) })

      await app.inject({ method: 'GET', url: '/thing' })

      const proxied = lines.find((line) => line.msg === `Proxied to ${proxyName}`)
      expect(proxied).not.toHaveProperty('body')
      // Size is still there, so volume is observable without paying for the content
      expect(proxied).toHaveProperty('bytes', expect.any(Number))

      await app.close()
      await upstream.close()
    })

    it('logs successful bodies when the proxy opts in', async () => {
      const upstream = await startUpstream((reply) => reply.send({ ok: true }))
      const { lines, logger } = captureLogs()
      const app = Fastify({ logger })
      await registerProxy(app, { name: proxyName, upstream: upstreamUrl(upstream), logResponseBody: 'always' })

      await app.inject({ method: 'GET', url: '/thing' })

      const proxied = lines.find((line) => line.msg === `Proxied to ${proxyName}`)
      expect(proxied).toMatchObject({ status: 200, body: JSON.stringify({ ok: true }) })

      await app.close()
      await upstream.close()
    })

    it('truncates a large body and forwards it whole', async () => {
      const huge = 'x'.repeat(50_000)
      const upstream = await startUpstream((reply) => reply.send({ huge }))
      const { lines, logger } = captureLogs()
      const app = Fastify({ logger })
      await registerProxy(app, { name: proxyName, upstream: upstreamUrl(upstream), logResponseBody: 'always' })

      const response = await app.inject({ method: 'GET', url: '/thing' })

      // Client gets all 50k
      expect(response.json().huge).toHaveLength(50_000)

      const proxied = lines.find((line) => line.msg === `Proxied to ${proxyName}`)
      expect((proxied?.body as string).length).toBeLessThanOrEqual(2048)
      expect(proxied).toMatchObject({ bodyTruncated: true })
      expect(proxied?.bytes).toBeGreaterThan(50_000)

      await app.close()
      await upstream.close()
    })

    it('logs only the size for a non-text body', async () => {
      const upstream = await startUpstream((reply) =>
        reply.type('application/octet-stream').send(Buffer.from([1, 2, 3]))
      )
      const { lines, logger } = captureLogs()
      const app = Fastify({ logger })
      await registerProxy(app, { name: proxyName, upstream: upstreamUrl(upstream), logResponseBody: 'always' })

      await app.inject({ method: 'GET', url: '/thing' })

      const proxied = lines.find((line) => line.msg === `Proxied to ${proxyName}`)
      expect(proxied).not.toHaveProperty('body')
      expect(proxied).toMatchObject({ bytes: 3, contentType: 'application/octet-stream' })

      await app.close()
      await upstream.close()
    })
  })

  /**
   * One ECONNRESET, one DNS hiccup or one oversized response says nothing about the upstream's
   * health. Blocking on a single event turned an isolated blip into an outage of every URL and
   * method of that proxy, on every pod, for the full memory window.
   */
  it('keeps forwarding while failures are isolated', async () => {
    const app = Fastify()
    await registerProxy(app, { name: proxyName, upstream: UNREACHABLE })

    // Well short of the threshold: every one of these must still reach the upstream
    for (let attempt = 0; attempt < FAILURES_BEFORE_BLOCKING - 1; attempt++) {
      const response = await app.inject({ method: 'GET', url: '/' })
      expect(response.statusCode).not.toBe(503)
    }

    await app.close()
  })

  it('stops forwarding once failures are sustained', async () => {
    const app = Fastify()
    await registerProxy(app, { name: proxyName, upstream: UNREACHABLE })

    for (let attempt = 0; attempt < FAILURES_BEFORE_BLOCKING; attempt++) {
      await app.inject({ method: 'GET', url: '/' })
    }

    const blocked = await app.inject({ method: 'GET', url: '/' })
    expect(blocked.statusCode).toBe(503)
    expect(blocked.json()).toEqual({ message: `${proxyName} upstream is unavailable` })

    await app.close()
  })

  /**
   * The distinction that makes the failure memory safe: an upstream that answers is reachable, so a
   * 500 on one URL must not stop every other URL being forwarded.
   */
  it('does not trip the failure memory when the upstream answers with an error', async () => {
    const upstream = await startUpstream((reply) => reply.code(500).send({ boom: true }))
    const app = Fastify()
    await registerProxy(app, { name: proxyName, upstream: upstreamUrl(upstream) })

    const first = await app.inject({ method: 'GET', url: '/' })
    expect(first.statusCode).toBe(500)

    // Still forwarded, still the upstream's own error rather than our 503
    const second = await app.inject({ method: 'GET', url: '/' })
    expect(second.statusCode).toBe(500)
    expect(second.json()).toEqual({ boom: true })

    await app.close()
    await upstream.close()
  })

  /**
   * reply-from retries a 503 GET ten times by default and misreads Retry-After as milliseconds, so
   * one inbound request became eleven upstream ones. This pins the fix, because it relies on
   * reply-from gating that branch on retriesCount === 0 rather than on a documented option.
   */
  it('does not amplify an upstream 503 into repeated upstream calls', async () => {
    let hits = 0
    const upstream = Fastify()
    upstream.get('/*', async (_request, reply) => {
      hits++
      // Asking politely to back off used to make it worse: parsed as 30ms, not 30s
      return reply.header('retry-after', '30').code(503).send({ busy: true })
    })
    await upstream.listen({ port: 0, host: '127.0.0.1' })

    const app = Fastify()
    await registerProxy(app, { name: proxyName, upstream: upstreamUrl(upstream) })

    const response = await app.inject({ method: 'GET', url: '/thing' })

    expect(hits).toBe(1)
    expect(response.statusCode).toBe(503)

    await app.close()
    await upstream.close()
  })

  it('times out a hung upstream instead of hanging with it', async () => {
    // Never replies
    const upstream = await startUpstream(() => new Promise(() => undefined) as never)
    const app = Fastify()
    await registerProxy(app, {
      name: proxyName,
      upstream: upstreamUrl(upstream),
      undici: { headersTimeout: 50, bodyTimeout: 50 },
    })

    const response = await app.inject({ method: 'GET', url: '/' })

    expect(response.statusCode).toBeGreaterThanOrEqual(500)

    await app.close()
    await upstream.close()
  })
})
