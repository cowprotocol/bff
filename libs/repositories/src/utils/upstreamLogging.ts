import { logger } from '@cowprotocol/shared'
import type { Middleware } from 'openapi-fetch'

/**
 * Start time per in-flight call, keyed by the Request openapi-fetch hands to both hooks.
 *
 * Weak on purpose: a Map keyed by request id would retain an entry for every call that never reaches
 * onResponse, which is every timeout and abort, i.e. exactly what an upstream outage produces. Here
 * the entry goes when the request does, with no cleanup to forget.
 */
const startedAt = new WeakMap<Request, number>()

/**
 * Logs one line per outbound call an openapi-fetch client makes.
 *
 * Only misses were observable before: a price source that answered was silent, so call volume, hit
 * rate, error rate and latency were all unmeasurable, and a hung upstream left no trace at all.
 *
 * `operation` is the templated path from the OpenAPI schema, not the final URL, so cardinality stays
 * low and token addresses stay out of the field. The body is deliberately not logged: it is large,
 * and a failing response already reaches the logs through the error `throwIfUnsuccessful` raises.
 */
export function upstreamLogging(upstream: string): Middleware {
  return {
    onRequest({ request }) {
      startedAt.set(request, Date.now())
    },

    onResponse({ schemaPath, params, request, response }) {
      const started = startedAt.get(request)

      logger.info(
        {
          upstream,
          operation: schemaPath,
          method: request.method,
          // What we actually asked for, which is the whole point: the operation alone cannot tell
          // two /native_price calls apart, nor show that 0xEeee… resolved to ids=ethereum. Path and
          // query only. Headers hold the API key and cookies are never useful here.
          params: { ...params.path, ...params.query },
          status: response.status,
          ms: started === undefined ? undefined : Date.now() - started,
        },
        `Called ${upstream}`
      )
    },
  }
}
