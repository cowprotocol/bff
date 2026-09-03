import Fastify from 'fastify'
import pino from 'pino'
import { Writable } from 'stream'
import { registerProxy } from './registerProxy'

/**
 * Hits the real tokens-proxy upstream over real HTTP, following the same convention as
 * UsdRepositoryCoingecko.test.ts: runs only when the environment provides what it needs, skips
 * silently otherwise, so CI stays offline-safe.
 *
 *   PROXY_UPSTREAM=https://real-upstream npx nx test api --testPathPattern=registerProxy.test
 *
 * Optionally set PROXY_TEST_PATH (defaults to '/') to request a specific path.
 */
const upstream = process.env.PROXY_UPSTREAM
const path = process.env.PROXY_TEST_PATH || '/'

const describeWithUpstream = upstream ? describe : describe.skip

describeWithUpstream('registerProxy against the real upstream', () => {
  jest.setTimeout(30000)

  it('forwards the call and logs the response it got back', async () => {
    const lines: Record<string, unknown>[] = []
    const sink = new Writable({
      write(chunk, _encoding, callback) {
        chunk
          .toString()
          .split('\n')
          .filter(Boolean)
          .forEach((line: string) => {
            try {
              lines.push(JSON.parse(line))
            } catch {
              // pino-pretty or a non-JSON line
            }
          })
        callback()
      },
    })

    const app = Fastify({ logger: pino({ level: 'info' }, sink) })
    // 'always' so the body is logged whatever the upstream answers, which is the point of the run
    await registerProxy(app, { name: 'tokens-manual-test', upstream: upstream as string, logResponseBody: 'always' })

    const response = await app.inject({ method: 'GET', url: path })
    await new Promise((resolve) => setTimeout(resolve, 200))

    const proxied = lines.find((line) => line.msg === 'Proxied to tokens-manual-test')

    // Printed so a manual run shows what the upstream actually returned
    console.log('response status:', response.statusCode)
    console.log('log line:', JSON.stringify(proxied, null, 2))

    expect(proxied).toBeDefined()
    expect(proxied).toMatchObject({ proxy: 'tokens-manual-test', url: path, method: 'GET' })
    expect(proxied?.status).toBe(response.statusCode)
    // The size logged must match what the client actually received
    expect(proxied?.bytes).toBe(Buffer.byteLength(response.rawPayload))

    await app.close()
  })
})
