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
    const signal = init?.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal

    return fetch(input, { ...init, signal })
  }
}
