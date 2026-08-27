import pino from 'pino'
import { requestContext } from './requestContext'

export function createLogger() {
  // Uses pretty print if env.LOG_FORMAT is set to 'pretty'. By default, it will also use it for non-production environments.
  // If the env.LOG_FORMAT is not 'pretty', it defaults to a JSON logger.
  const usePrettyPrint = process.env.LOG_FORMAT
    ? process.env.LOG_FORMAT === 'pretty'
    : process.env.NODE_ENV !== 'production'

  const loggerConfigEnv = usePrettyPrint
    ? {
        transport: {
          target: 'pino-pretty',
        },
      }
    : {}

  return pino({
    ...loggerConfigEnv,
    level: process.env.LOG_LEVEL ?? 'info',
    // Defence in depth. A proxy was logging whole inbound header objects at info, so any Authorization
    // or Cookie a caller sent was landing in the logs. That line is gone, but nothing structural
    // stopped the next one, and headers reach the logger under several different keys.
    redact: {
      paths: [
        'headers.authorization',
        'headers.cookie',
        'headers["x-api-key"]',
        'headers["x-cg-pro-api-key"]',
        '*.headers.authorization',
        '*.headers.cookie',
        '*.headers["x-api-key"]',
        '*.headers["x-cg-pro-api-key"]',
      ],
      censor: '[redacted]',
    },
    // Adds the request id to every line logged while serving a request, including lines from
    // repositories and services that never see the Fastify request. Empty outside a request.
    mixin: () => requestContext.getStore() ?? {},
  })
}
