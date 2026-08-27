import pino, { DestinationStream } from 'pino'
import { requestContext } from './requestContext'

/** @param destination optional sink, so tests can assert on what is actually written */
export function createLogger(destination?: DestinationStream) {
  // Uses pretty print if env.LOG_FORMAT is set to 'pretty'. By default, it will also use it for non-production environments.
  // If the env.LOG_FORMAT is not 'pretty', it defaults to a JSON logger.
  const usePrettyPrint = process.env.LOG_FORMAT
    ? process.env.LOG_FORMAT === 'pretty'
    : process.env.NODE_ENV !== 'production'

  // Pino rejects a transport and an explicit destination together, and a caller passing a destination
  // wants the raw lines rather than pretty ones anyway.
  const loggerConfigEnv =
    usePrettyPrint && !destination
      ? {
          transport: {
            target: 'pino-pretty',
          },
        }
      : {}

  const options = {
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
    // Adds the request id to lines logged by repositories and services, which use this logger
    // directly and never see the Fastify request. Empty outside a request.
    //
    // Skipped when the logger already binds a reqId, i.e. Fastify's per-request child. Emitting ours
    // there wrote the key twice, and since JSON.parse keeps the last occurrence, ours shadowed
    // Fastify's. That matters because ours can be stale: reply-from keeps one long-lived undici Pool,
    // so its response callbacks run in whatever async context owned the connection rather than the
    // current request, and a proxied response was logged under an earlier request's id.
    //
    // The returned object must also be fresh each call. Pino's default merge is
    // `Object.assign(mixinObject, logged)`, which writes the logged fields INTO whatever the mixin
    // returned, so returning the store itself made every field logged during a request stick to it
    // and reappear on later lines.
    mixin: (_mergeObject: object, _level: number, logger?: pino.Logger) => {
      if (bindsRequestId(logger)) {
        return {}
      }

      return { ...requestContext.getStore() }
    },
  }

  return destination ? pino(options, destination) : pino(options)
}

/**
 * Whether a logger already carries a reqId binding, as Fastify's per-request child logger does.
 *
 * Pino keeps a child's bindings as a pre-serialised JSON fragment, so this reads that rather than
 * duplicating the key and hoping the right one wins.
 */
function bindsRequestId(logger?: pino.Logger): boolean {
  const chindings = (logger as unknown as Record<symbol, unknown> | undefined)?.[pino.symbols.chindingsSym]

  return typeof chindings === 'string' && chindings.includes('"reqId"')
}
