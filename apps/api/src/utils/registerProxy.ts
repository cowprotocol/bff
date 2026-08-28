import { CacheRepository, cacheRepositorySymbol, getCacheKey } from '@cowprotocol/repositories'
import httpProxy, { FastifyHttpProxyOptions } from '@fastify/http-proxy'
import { FastifyInstance } from 'fastify'
import { pipeline, Readable } from 'stream'
import { apiContainer } from '../app/inversify.config'
import { tapBody } from './tapBody'

const cacheRepository: CacheRepository = apiContainer.get(cacheRepositorySymbol)

/** Matches the outbound timeout used by the Coingecko and Cow clients. */
const UPSTREAM_TIMEOUT_MS = 10_000

/**
 * How long a sustained transport failure stops us forwarding to an upstream.
 *
 * Keyed by upstream rather than by URL. The price path remembers failures per token, because a
 * failure there is about one token and there is another price source to fall back to. A proxy has
 * neither: an unreachable upstream is unreachable for every URL, not just the one asked for.
 */
const FAILURE_MEMORY_SECONDS = 20

/**
 * Consecutive failures before we stop forwarding.
 *
 * One ECONNRESET, one DNS hiccup, or one response too large for the body timeout says nothing about
 * the upstream's health, and blocking on it would turn an isolated blip into an outage of every URL
 * and method of that proxy, on every pod. The count is deliberately high: a false block is far more
 * expensive than a few wasted attempts against an upstream that really is down.
 *
 * A useful side effect is that the block only engages where hammering is possible at all. A proxy
 * serving a handful of requests a day never accumulates ten failures, and never needs to.
 */
export const FAILURES_BEFORE_BLOCKING = 10

/**
 * How long a failure counts toward the threshold. Shorter than the block itself, so the tally clears
 * during a block and recovery starts from zero rather than re-blocking on the next single failure.
 */
const FAILURE_WINDOW_SECONDS = 10

/**
 * Start time per in-flight proxied request. Weak, so a request that never completes retains nothing,
 * and the timing needs no cleanup of its own.
 */
const startedAt = new WeakMap<object, number>()

/**
 * How much of a response body is kept for logging.
 *
 * Bodies are the one field that can dwarf everything else: a token list response is orders of
 * magnitude larger than the line describing it. Only this prefix is retained, so the cost per call is
 * bounded regardless of response size.
 */
const MAX_LOGGED_BODY_BYTES = 2048

/** Bodies worth reading as text. Anything else is logged as a size only. */
const LOGGABLE_CONTENT_TYPE = /^(application\/(json|.*\+json|xml)|text\/)/i

export type LogResponseBody = 'never' | 'errors' | 'always'

/** reply-from reads `retriesCount` from the per-call options but never declares it in its types. */
type ReplyOptions = NonNullable<FastifyHttpProxyOptions['replyOptions']> & { retriesCount?: number }

export interface ProxyDefinition {
  /** Short name, used in log lines and as the failure-memory key. e.g. 'tokens' */
  name: string
  upstream: string
  /**
   * When to include the response body in the log line, truncated to MAX_LOGGED_BODY_BYTES.
   *
   * Defaults to 'errors', which is where a body actually explains something. 'always' is useful for a
   * low-volume proxy or while debugging one, but on a busy proxy with large responses it is the
   * single biggest thing you can do to log volume, so it is opt-in per proxy.
   */
  logResponseBody?: LogResponseBody
}

/**
 * Registers a proxy with the behaviour every proxy should have, so a new one gets it for free.
 *
 * Adds three things none of the proxies had:
 * - a timeout, so a hung upstream cannot hold a request open indefinitely
 * - a log line per forwarded call, with status and duration, on both success and failure. Fastify
 *   already logs the inbound request, so this completes the picture with the upstream leg
 * - a short memory of transport failures, so an unreachable upstream is not hammered once per request
 */
export async function registerProxy(
  fastify: FastifyInstance,
  {
    name,
    upstream,
    logResponseBody = 'errors',
    ...options
  }: ProxyDefinition & Omit<FastifyHttpProxyOptions, 'upstream'>
): Promise<void> {
  const failureKey = getCacheKey('proxy-failure', name)
  const failureCountKey = getCacheKey('proxy-failure-count', name)

  await fastify.register(httpProxy, {
    ...options,
    upstream,
    undici: {
      headersTimeout: UPSTREAM_TIMEOUT_MS,
      bodyTimeout: UPSTREAM_TIMEOUT_MS,
      ...options.undici,
    },
    preHandler: async (request, reply) => {
      if (await cacheRepository.get(failureKey).catch(() => null)) {
        request.log.warn(
          { proxy: name, url: request.url },
          `${name} upstream failed in the last ${FAILURE_MEMORY_SECONDS}s, not forwarding`
        )

        return reply.code(503).send({ message: `${name} upstream is unavailable` })
      }

      markStart(request)
    },
    replyOptions: {
      /**
       * Stops reply-from amplifying a 503 into eleven upstream requests.
       *
       * Its default retries a GET that gets a 503 up to `maxRetriesOn503` (10) times, and it reads
       * `Retry-After` as milliseconds when RFC 9110 defines it as seconds or an HTTP-date. Measured:
       * a plain 503 costs 11 upstream calls; `Retry-After: 30` (meaning 30s) makes that 11 calls in
       * 340ms; an HTTP-date becomes NaN and fires them in 21ms. The politer the upstream is about
       * being overloaded, the harder we hit it.
       *
       * `maxRetriesOn503: 0` cannot express this: reply-from reads it as `opts.maxRetriesOn503 || 10`,
       * so zero is falsy and silently restores the default. The 503 branch is instead gated on
       * `retriesCount === 0`, so any non-zero value disables it, and doubles as one retry on a socket
       * error, which is worth having. Pinned by a test, since it depends on that internal condition.
       */
      retriesCount: 1,
      ...options.replyOptions,
      // The third argument is the response BODY stream, not the response: reply-from calls
      // `this.code(res.statusCode)` before this hook, so the upstream status is already on the reply.
      // Reading `.statusCode` off the stream silently yields undefined and pino drops the field.
      onResponse: (request, reply, body) => {
        const status = reply.statusCode
        const contentType = String(reply.getHeader('content-type') ?? '')
        const wantsBody = logResponseBody === 'always' || (logResponseBody === 'errors' && status >= 400)
        const isReadable = LOGGABLE_CONTENT_TYPE.test(contentType)

        // Logged once the body has flushed, so `bytes` and `ms` cover the whole upstream leg rather
        // than just its headers.
        const tap = tapBody(wantsBody && isReadable ? MAX_LOGGED_BODY_BYTES : 0, ({ bytes, snippet, truncated }) => {
          request.log.info(
            {
              proxy: name,
              url: request.url,
              method: request.method,
              status,
              ms: elapsed(request),
              contentType: contentType || undefined,
              bytes,
              body: snippet,
              bodyTruncated: snippet !== undefined && truncated ? true : undefined,
            },
            `Proxied to ${name}`
          )
        })

        // pipeline rather than body.pipe: pipe does not forward a source error to the destination, so
        // an upstream body that fails mid-transfer would leave the tap alive, never report, and the
        // call would go unlogged. Partial responses are exactly what the logging is for.
        pipeline(body as unknown as Readable, tap, () => undefined)

        // reply-from types the third argument as an http response, but only ever passes a readable
        // body stream, so a tapped stream is the same shape it already had
        const callerOnResponse = options.replyOptions?.onResponse
        const tapped = tap as unknown as Parameters<NonNullable<typeof callerOnResponse>>[2]

        if (callerOnResponse) {
          callerOnResponse(request, reply, tapped)
        } else {
          reply.send(tapped)
        }
      },
      onError: (reply, { error }) => {
        const { request } = reply

        // Transport level: refused, reset, DNS, or one of the timeouts above. An upstream that
        // answered with a 4xx or 5xx goes through onResponse instead and does not trip this.
        request.log.error(
          { proxy: name, url: request.url, method: request.method, ms: elapsed(request), err: error.message },
          `Proxy to ${name} failed`
        )

        // Tally rather than a flag. Reading then writing races across pods, which only means the
        // odd lost increment and a block that trips a little later: fine for a heuristic, and far
        // cheaper than adding an atomic counter to CacheRepository for this one caller.
        cacheRepository
          .get(failureCountKey)
          .then((recorded) => {
            const failures = Number(recorded ?? 0) + 1

            return failures >= FAILURES_BEFORE_BLOCKING
              ? cacheRepository.set(failureKey, '1', FAILURE_MEMORY_SECONDS)
              : cacheRepository.set(failureCountKey, String(failures), FAILURE_WINDOW_SECONDS)
          })
          .catch((cacheError) => {
            request.log.warn(`Could not remember ${name} failure: ${cacheError}`)
          })

        if (options.replyOptions?.onError) {
          options.replyOptions.onError(reply, { error })
        } else {
          reply.send(error)
        }
      },
    } as ReplyOptions,
  })
}

// Typed as object rather than FastifyRequest: the plugin hooks and the route handler disagree on the
// request generics, and neither helper cares about anything beyond identity.
function markStart(request: object): void {
  startedAt.set(request, Date.now())
}

function elapsed(request: object): number | undefined {
  const started = startedAt.get(request)

  return started === undefined ? undefined : Date.now() - started
}
