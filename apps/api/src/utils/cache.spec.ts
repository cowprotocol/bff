import { getRequestCacheKey } from './cache'

/**
 * Real barn traffic, 2026-11-25: the chart polls with `to` set to `now` at second resolution, so a key
 * built from the raw URL moved on every request and `/priceHistory` never got a cache hit.
 */
const CHART_URL = '/59144/tokens/0x176211869ca2b568f2a7d4ee941e073a821ee1ff/priceHistory'

function chartUrl(from: number, to: number, interval = '5m') {
  return `${CHART_URL}?from=${from}&to=${to}&interval=${interval}`
}

describe('getRequestCacheKey', () => {
  it('gives two viewers in the same 30s window one key', () => {
    expect(getRequestCacheKey(chartUrl(1795535151, 1795621551))).toEqual(
      getRequestCacheKey(chartUrl(1795535159, 1795621559))
    )
  })

  it('still moves to a new key in the next window, so the chart keeps refreshing', () => {
    expect(getRequestCacheKey(chartUrl(1795535151, 1795621551))).not.toEqual(
      getRequestCacheKey(chartUrl(1795535161, 1795621561))
    )
  })

  it('keeps intervals apart', () => {
    expect(getRequestCacheKey(chartUrl(1795535151, 1795621551, '5m'))).not.toEqual(
      getRequestCacheKey(chartUrl(1795535151, 1795621551, '1h'))
    )
  })

  it('leaves non-numeric from/to alone', () => {
    const url =
      '/1/simulation?from=0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2&to=0xdac17f958d2ee523a2206206994597c13d831ec7'

    expect(getRequestCacheKey(url)).toEqual(getRequestCacheKey(url))
    expect(getRequestCacheKey(url)).toContain('0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2')
  })

  it('leaves a query-less URL exactly as it was keyed before', () => {
    expect(getRequestCacheKey('/1/tokens/0xabc/supply')).toBe('requests:1:tokens:0xabc:supply')
  })
})
