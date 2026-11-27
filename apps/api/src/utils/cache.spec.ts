import { getRequestCacheKey } from './cache'

/**
 * Real barn traffic, 2026-11-25: the chart polls with `to` set to `now` at second resolution, so a key
 * built from the raw URL moved on every request and `/priceHistory` never got a cache hit.
 */
const CHART_URL = '/59144/tokens/0x176211869ca2b568f2a7d4ee941e073a821ee1ff/priceHistory'
const CHART_TIMESTAMP_PARAMS = ['from', 'to']

function chartKey(from: number, to: number, interval = '5m') {
  return getRequestCacheKey(`${CHART_URL}?from=${from}&to=${to}&interval=${interval}`, CHART_TIMESTAMP_PARAMS)
}

describe('getRequestCacheKey', () => {
  it('gives two viewers in the same 30s window one key', () => {
    expect(chartKey(1795535151, 1795621551)).toEqual(chartKey(1795535159, 1795621559))
  })

  it('still moves to a new key in the next window, so the chart keeps refreshing', () => {
    expect(chartKey(1795535151, 1795621551)).not.toEqual(chartKey(1795535161, 1795621561))
  })

  it('keeps intervals apart', () => {
    expect(chartKey(1795535151, 1795621551, '5m')).not.toEqual(chartKey(1795535151, 1795621551, '1h'))
  })

  it('keys a route that names no timestamp params verbatim', () => {
    const paged = (from: number, to: number) => `/1/things?from=${from}&to=${to}`

    // Same 30s bucket, but `from`/`to` mean something else here, so the two must stay distinct
    expect(getRequestCacheKey(paged(0, 100))).not.toEqual(getRequestCacheKey(paged(0, 119)))
  })

  it('keeps a repeated timestamp param distinct from the valid request', () => {
    // Validation runs after the key is built and rejects the duplicate, so collapsing it here would
    // serve the cached 200 instead of the 400
    const valid = `${CHART_URL}?from=1795535151&to=1795621551&interval=5m`
    const duplicated = `${CHART_URL}?from=1795535151&from=bad&to=1795621551&interval=5m`

    expect(getRequestCacheKey(valid, CHART_TIMESTAMP_PARAMS)).not.toEqual(
      getRequestCacheKey(duplicated, CHART_TIMESTAMP_PARAMS)
    )
  })

  it('leaves non-numeric values alone', () => {
    const url =
      '/1/simulation?from=0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2&to=0xdac17f958d2ee523a2206206994597c13d831ec7'

    expect(getRequestCacheKey(url, CHART_TIMESTAMP_PARAMS)).toContain('0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2')
  })

  it('leaves a query-less URL exactly as it was keyed before', () => {
    expect(getRequestCacheKey('/1/tokens/0xabc/supply')).toBe('requests:1:tokens:0xabc:supply')
  })
})
