import { Logger } from '../types'
import { interruptibleSleep } from './misc'

export async function doForever(params: {
  name: string
  callback: (stop: () => void) => Promise<void>
  waitTimeMilliseconds: number
  logger: Logger
  signal?: AbortSignal
}) {
  const { name, callback, waitTimeMilliseconds, logger, signal } = params

  logger.info(`[${name}] Starting. Running logic every ${waitTimeMilliseconds / 1000}s`)

  let running = !signal?.aborted
  const stop = () => {
    logger.info(`[${name}] Stopping...`)
    running = false
  }

  signal?.addEventListener('abort', stop, { once: true })

  while (running) {
    try {
      await callback(stop)
    } catch (error) {
      const errorName = error instanceof Error ? `: ${error.name}` : ''
      logger.error(error, `[${name}] Error${errorName}`)
      logger.info(`[${name}] Next-run in ${waitTimeMilliseconds / 1000}s...`)
    }

    // Don't sleep if we were told to stop while the callback was running: react immediately
    if (!running) break

    // Sleeps for `waitTimeMilliseconds`, but wakes up immediately if `signal` is aborted in the meantime
    await interruptibleSleep(waitTimeMilliseconds, signal)
  }

  logger.info(`[${name}] Stopped`)
}
