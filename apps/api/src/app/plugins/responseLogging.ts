import { FastifyPluginCallback } from 'fastify'
import fp from 'fastify-plugin'
import { LOGGABLE_CONTENT_TYPE, LogResponseBody, shouldLogBody, truncateBody } from '../../utils/logResponseBody'

declare module 'fastify' {
  interface FastifyContextConfig {
    /**
     * Whether this route's response body appears in its log line. Defaults to 'errors'.
     *
     * Set 'always' on a route whose resolved value is worth seeing in production, e.g. the price
     * /usdPrice returns. Cheaper than a hand-written line per route, and consistent with the proxies.
     */
    logResponseBody?: LogResponseBody
  }
}

/**
 * Logs what the api actually sent back.
 *
 * Fastify's own 'request completed' carries the status and duration but never the payload, so the
 * resolved value of a request was only visible where a route hand-rolled its own line. This replaces
 * those, uniformly and under one policy.
 *
 * Deliberately synchronous. Most handlers here are async and call `reply.send()` without returning
 * it, which Fastify tolerates only because the onSend chain finishes before the handler's promise
 * resolves. An async hook defers that chain by a microtask, so `reply.sent` is still false when the
 * handler resolves and Fastify sends a second time, crashing the process with ERR_HTTP_HEADERS_SENT.
 *
 * Streams are skipped: the proxies send one, and registerProxy already logs those through a tap that
 * does not consume the body.
 */
export const responseLogging: FastifyPluginCallback = (fastify, opts, next) => {
  fastify.addHook('onSend', (request, reply, payload, done) => {
    const policy = request.routeConfig?.logResponseBody ?? 'errors'

    if (policy === 'never' || typeof payload !== 'string' || !shouldLogBody(policy, reply.statusCode)) {
      done()
      return
    }

    const contentType = String(reply.getHeader('content-type') ?? '')
    const bytes = Buffer.byteLength(payload)
    const { snippet, truncated } = LOGGABLE_CONTENT_TYPE.test(contentType)
      ? truncateBody(payload)
      : { snippet: undefined, truncated: false }

    request.log.info(
      {
        status: reply.statusCode,
        bytes,
        contentType: contentType || undefined,
        body: snippet,
        bodyTruncated: truncated || undefined,
      },
      'Response sent'
    )

    done()
  })

  next()
}

export default fp(responseLogging, { fastify: '4.x', name: 'responseLogging' })
