import { Writable } from 'stream'
import { createLogger } from './logger'
import { getRequestContext, requestContext } from './requestContext'

describe('requestContext', () => {
  it('is undefined outside a request', () => {
    expect(getRequestContext()).toBeUndefined()
  })

  it('survives the async hops a repository call makes', async () => {
    // The point of the store: UsdRepositoryFallback logs after several awaits and a timer, far from
    // the Fastify hook that set the id.
    const seen = await new Promise<string | undefined>((resolve) => {
      requestContext.run({ reqId: 'req-42' }, () => {
        Promise.resolve()
          .then(() => new Promise((r) => setTimeout(r, 1)))
          .then(() => resolve(getRequestContext()?.reqId))
      })
    })

    expect(seen).toBe('req-42')
  })

  it('keeps concurrent requests separate', async () => {
    const read = (reqId: string) =>
      new Promise<string | undefined>((resolve) => {
        requestContext.run({ reqId }, () => {
          setTimeout(() => resolve(getRequestContext()?.reqId), Math.random() * 5)
        })
      })

    await expect(Promise.all([read('a'), read('b'), read('c')])).resolves.toEqual(['a', 'b', 'c'])
  })
})

describe('logger request id', () => {
  function capture(): { lines: Record<string, unknown>[]; log: ReturnType<typeof createLogger> } {
    const lines: Record<string, unknown>[] = []
    const sink = new Writable({
      write(chunk, _encoding, callback) {
        chunk
          .toString()
          .split('\n')
          .filter(Boolean)
          .forEach((line: string) => lines.push(JSON.parse(line)))
        callback()
      },
    })

    return { lines, log: createLogger(sink) }
  }

  it('tags lines logged during a request, and leaves others alone', () => {
    const { lines, log } = capture()

    log.info('outside')
    requestContext.run({ reqId: 'req-1' }, () => log.info('inside'))

    expect(lines[0]).not.toHaveProperty('reqId')
    expect(lines[1]).toMatchObject({ reqId: 'req-1' })
  })

  /**
   * Pino's default merge is `Object.assign(mixinObject, loggedObject)`, so it writes the logged fields
   * INTO whatever the mixin returned. Returning the context store itself made every field ever logged
   * during a request stick to it and reappear on every later line, silently duplicating a proxy's
   * whole response body onto `request completed`.
   */
  /**
   * Fastify binds reqId on its per-request child logger, and that value is authoritative. Emitting
   * ours as well wrote the key twice, and since JSON.parse keeps the last occurrence, ours won. Ours
   * can be stale, because reply-from's long-lived undici Pool runs response callbacks in whatever
   * async context owned the connection, so a proxied response got logged under an earlier request's id.
   */
  it('never shadows a reqId the logger already binds', () => {
    const written: string[] = []
    const sink = new Writable({
      write(chunk, _encoding, callback) {
        written.push(chunk.toString())
        callback()
      },
    })
    const child = createLogger(sink).child({ reqId: 'fastify-req-9' })

    // A stale context, as a pooled connection callback would see
    requestContext.run({ reqId: 'stale-req-1' }, () => child.info('proxied'))

    const raw = written.join('')
    expect(raw.match(/"reqId"/g)).toHaveLength(1)
    expect(JSON.parse(raw).reqId).toBe('fastify-req-9')
  })

  it('does not let one line leak its fields into the next', () => {
    const { lines, log } = capture()

    requestContext.run({ reqId: 'req-1' }, () => {
      log.info({ body: 'x'.repeat(50), bytes: 50 }, 'proxied')
      log.info({ res: { statusCode: 200 } }, 'request completed')
    })

    const [proxied, completed] = lines

    expect(proxied).toMatchObject({ reqId: 'req-1', bytes: 50 })
    expect(completed).toMatchObject({ reqId: 'req-1', res: { statusCode: 200 } })
    expect(completed).not.toHaveProperty('body')
    expect(completed).not.toHaveProperty('bytes')
  })
})
