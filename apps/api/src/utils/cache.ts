import { getCacheKey } from '@cowprotocol/repositories'

export const CACHE_CONTROL_HEADER = 'cache-control'

export function getCacheControlHeaderValue(ttl: number, ttlSharedCache?: number) {
  return `max-age=${ttl}, public, s-maxage=${ttlSharedCache || ttl}`
}

type Directives = { [key: string]: string }

export function parseCacheControlHeaderValue(headerValue?: string | number | string[]): Directives {
  if (!headerValue || typeof headerValue !== 'string') {
    return {}
  }

  const directivesResult: Directives = {}

  const parts = headerValue.split(',')
  parts.forEach((part) => {
    const trimmedPart = part.trim()
    if (trimmedPart.includes('=')) {
      const [key, value] = trimmedPart.split('=')
      directivesResult[key] = value
    } else {
      directivesResult[trimmedPart] = 'true'
    }
  })

  return directivesResult
}

/** Clients poll with `to` set to `now` at second resolution, so an unrounded key never hits. */
const TIMESTAMP_GRID_SECONDS = 30

/**
 * Cache key for a request URL.
 *
 * `timestampParams` names the query params holding a unix timestamp, which are rounded onto a shared
 * grid so clients polling the same window land on one entry. Only the route knows which of its params
 * are times, so a route that names none is keyed verbatim.
 */
export function getRequestCacheKey(url: string, timestampParams: readonly string[] = []): string {
  return getCacheKey('requests', ...roundTimestampParams(url, timestampParams).split('/'))
}

function roundTimestampParams(url: string, timestampParams: readonly string[]): string {
  if (timestampParams.length === 0) {
    return url
  }

  const queryStart = url.indexOf('?')
  if (queryStart === -1) {
    return url
  }

  const params = new URLSearchParams(url.slice(queryStart + 1))
  let rounded = false

  for (const name of timestampParams) {
    // A repeated param is rejected by validation, which runs after this key is built. Rounding it
    // would drop the extra occurrence and hand the request the valid response cached under that key.
    const values = params.getAll(name)
    if (values.length !== 1 || !/^\d+$/.test(values[0])) {
      continue
    }

    params.set(name, String(Math.floor(Number(values[0]) / TIMESTAMP_GRID_SECONDS) * TIMESTAMP_GRID_SECONDS))
    rounded = true
  }

  return rounded ? `${url.slice(0, queryStart)}?${params}` : url
}
