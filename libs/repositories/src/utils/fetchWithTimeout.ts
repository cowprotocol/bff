/**
 * Default timeout for outbound HTTP calls.
 *
 * Neither the Coingecko nor the Cow client set one, so a hung upstream held a request open
 * indefinitely and left no trace: no response, no error, and the socket tied up until the client
 * gave up. An aborted call throws, which the repositories already treat as "try the next source".
 */
export const DEFAULT_UPSTREAM_TIMEOUT_MS = 10_000

/**
 * `fetch` with an abort deadline, for openapi-fetch clients.
 *
 * Composes with a caller-supplied signal rather than replacing it, so an upstream abort still works
 * if one is ever passed per request.
 */
export function fetchWithTimeout(timeoutMs = DEFAULT_UPSTREAM_TIMEOUT_MS): typeof fetch {
  return (input, init) => {
    const timeoutSignal = AbortSignal.timeout(timeoutMs)
    // openapi-fetch passes a Request and puts any caller signal on it, leaving init.signal empty.
    // Reading only init.signal meant the timeout signal replaced the caller's, silently discarding
    // their cancellation.
    const callerSignal = init?.signal ?? (input instanceof Request ? input.signal : undefined)
    const signal = callerSignal ? AbortSignal.any([callerSignal, timeoutSignal]) : timeoutSignal

    return fetch(input, { ...init, signal })
  }
}
