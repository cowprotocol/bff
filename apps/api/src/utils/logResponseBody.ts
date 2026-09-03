/**
 * When a response body is included in its log line.
 *
 * Shared by the proxies and by ordinary routes so both mean the same thing, and truncated the same
 * way, rather than each growing its own notion of "log the body".
 */
export type LogResponseBody = 'never' | 'errors' | 'always'

/**
 * How much of a body is kept for logging.
 *
 * Bodies are the one field that can dwarf everything else, so the cost per call is bounded regardless
 * of response size.
 */
export const MAX_LOGGED_BODY_BYTES = 2048

/** Bodies worth reading as text. Anything else is logged as a size only. */
export const LOGGABLE_CONTENT_TYPE = /^(application\/(json|.*\+json|xml)|text\/)/i

/**
 * 'errors' is the default because that is where a body explains something. Note it is status-based:
 * an upstream that reports failures with a 200 body, as GraphQL does, needs 'always'.
 */
export function shouldLogBody(policy: LogResponseBody, status: number): boolean {
  return policy === 'always' || (policy === 'errors' && status >= 400)
}

/** Truncates to the cap, reporting whether anything was dropped. */
export function truncateBody(body: string): { snippet: string; truncated: boolean } {
  const buffer = Buffer.from(body)

  return buffer.length <= MAX_LOGGED_BODY_BYTES
    ? { snippet: body, truncated: false }
    : { snippet: buffer.subarray(0, MAX_LOGGED_BODY_BYTES).toString('utf8'), truncated: true }
}
