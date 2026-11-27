import '@fastify/swagger'
import Fastify from 'fastify'
import { recordPriceSeriesCacheTtl } from '@cowprotocol/repositories'
import slippageTolerance from './slippageTolerance'

const mockGetSlippageBps = jest.fn()
const mockGetVolatilityDetails = jest.fn()

jest.mock('../../../../inversify.config', () => ({
  apiContainer: {
    get: () => ({
      getSlippageBps: () => mockGetSlippageBps(),
      getVolatilityDetails: () => mockGetVolatilityDetails(),
    }),
  },
}))

const BASE = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
const QUOTE = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'

function expectCacheTtlAtMost(header: unknown, maxSeconds: number) {
  const match = /^max-age=(\d+), public, s-maxage=\1$/.exec(String(header))
  expect(match).not.toBeNull()
  expect(Number(match?.[1])).toBeGreaterThan(0)
  expect(Number(match?.[1])).toBeLessThanOrEqual(maxSeconds)
}

it('does not cache a slippage response beyond the series it used', async () => {
  mockGetSlippageBps.mockImplementation(async () => {
    recordPriceSeriesCacheTtl(30)
    return 50
  })

  const app = Fastify()
  await app.register(slippageTolerance, { prefix: '/:chainId/markets/:baseTokenAddress-:quoteTokenAddress' })
  const response = await app.inject({ method: 'GET', url: `/1/markets/${BASE}-${QUOTE}/slippageTolerance` })

  expect(response.statusCode).toBe(200)
  expectCacheTtlAtMost(response.headers['cache-control'], 30)
  await app.close()
})

it('does not cache a slippage response when the series is expiring', async () => {
  mockGetSlippageBps.mockImplementation(async () => {
    recordPriceSeriesCacheTtl(0)
    return 50
  })

  const app = Fastify()
  await app.register(slippageTolerance, { prefix: '/:chainId/markets/:baseTokenAddress-:quoteTokenAddress' })
  const response = await app.inject({ method: 'GET', url: `/1/markets/${BASE}-${QUOTE}/slippageTolerance` })

  expect(response.statusCode).toBe(200)
  expect(response.headers['cache-control']).toBe('no-store')
  await app.close()
})

it('uses the earliest series expiry for volatility details', async () => {
  mockGetVolatilityDetails
    .mockImplementationOnce(async () => {
      recordPriceSeriesCacheTtl(60)
      return null
    })
    .mockImplementationOnce(async () => {
      recordPriceSeriesCacheTtl(30)
      return null
    })

  const app = Fastify()
  await app.register(slippageTolerance, { prefix: '/:chainId/markets/:baseTokenAddress-:quoteTokenAddress' })
  const response = await app.inject({ method: 'GET', url: `/1/markets/${BASE}-${QUOTE}/volatilityDetails` })

  expect(response.statusCode).toBe(200)
  expectCacheTtlAtMost(response.headers['cache-control'], 30)
  await app.close()
})
