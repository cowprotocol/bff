import { doForever } from './doForever'
import { Logger } from '../types'

const logger = {
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as unknown as Logger

describe('doForever', () => {
  it('stops immediately when the signal is aborted while sleeping, instead of waiting out the full interval', async () => {
    const controller = new AbortController()
    let callCount = 0

    const runPromise = doForever({
      name: 'test',
      waitTimeMilliseconds: 5_000,
      logger,
      signal: controller.signal,
      callback: async () => {
        callCount++
      },
    })

    // Let the first iteration run and enter the sleep phase before aborting
    await new Promise((resolve) => setImmediate(resolve))

    const start = Date.now()
    controller.abort()
    await runPromise
    const elapsed = Date.now() - start

    expect(callCount).toBe(1)
    expect(elapsed).toBeLessThan(500)
  })

  it('keeps running on the configured interval when never aborted', async () => {
    let callCount = 0
    const controller = new AbortController()

    const runPromise = doForever({
      name: 'test',
      waitTimeMilliseconds: 10,
      logger,
      signal: controller.signal,
      callback: async () => {
        callCount++
        if (callCount === 3) controller.abort()
      },
    })

    await runPromise

    expect(callCount).toBe(3)
  })
})
