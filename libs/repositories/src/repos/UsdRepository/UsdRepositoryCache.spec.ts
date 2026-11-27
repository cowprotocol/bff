import { SupportedChainId } from '@cowprotocol/cow-sdk'
import IORedis from 'ioredis'
import { WETH } from '../../../test/mock'
import { CacheRepositoryRedis } from '../CacheRepository/CacheRepositoryRedis'
import type { PricePoint } from './UsdRepository'
import { PRICE_SERIES_CACHE_SECONDS, UsdRepository, withPriceSeriesCacheTtl } from './UsdRepository'
import { UsdRepositoryCache } from './UsdRepositoryCache'

const CACHE_VALUE_SECONDS = 10
const CACHE_NULL_SECONDS = 20
// Kept in step with CACHE_ERROR_SECONDS in UsdRepositoryCache
const CACHE_ERROR_SECONDS = 20

const wethLowercase = WETH.toLocaleLowerCase()
const chainId = SupportedChainId.MAINNET.toString()

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    ttl: jest.fn(),
    set: jest.fn(),
  }))
})

describe('UsdRepositoryCache', () => {
  let usdRepositoryCache: UsdRepositoryCache
  let redisMock: jest.Mocked<IORedis>
  let proxyMock: jest.Mocked<UsdRepository>

  beforeEach(() => {
    redisMock = new IORedis() as jest.Mocked<IORedis>
    proxyMock = {
      name: 'ProxyMock',
      getUsdPrice: jest.fn(),
      getUsdPrices: jest.fn(),
    }
    const cacheRepository = new CacheRepositoryRedis(redisMock)
    usdRepositoryCache = new UsdRepositoryCache(
      proxyMock,
      cacheRepository,
      'test-cache',
      CACHE_VALUE_SECONDS,
      CACHE_NULL_SECONDS
    )
  })

  describe('name', () => {
    it('should delegate name to proxy', () => {
      expect(usdRepositoryCache.name).toEqual('ProxyMock')
    })
  })

  describe('getUsdPrice', () => {
    it('should return price from cache', async () => {
      // GIVEN: Cached value '100'
      redisMock.get.mockResolvedValue('100')

      // GIVEN: proxy returns 200
      proxyMock.getUsdPrice.mockResolvedValue(200)

      // WHEN: Get USD price
      const price = await usdRepositoryCache.getUsdPrice(chainId, WETH)

      // THEN: We get the cached value
      expect(price).toEqual(100)
      expect(proxyMock.getUsdPrice).not.toHaveBeenCalled()
    })

    it('should return NULL from cache', async () => {
      // GIVEN: Cached value 'null'
      redisMock.get.mockResolvedValue('null')

      // GIVEN: proxy returns 200
      proxyMock.getUsdPrice.mockResolvedValue(200)

      // WHEN: Get USD price
      const price = await usdRepositoryCache.getUsdPrice(chainId, WETH)

      // THEN: We get the cached value
      expect(price).toEqual(null)
      expect(proxyMock.getUsdPrice).not.toHaveBeenCalled()
    })

    it('should call the proxy if no cache, then cache the value', async () => {
      // GIVEN: The value is not cached
      redisMock.get.mockResolvedValue(null)

      // GIVEN: proxy returns 200
      proxyMock.getUsdPrice.mockResolvedValue(200)

      // When: Get USD price
      const price = await usdRepositoryCache.getUsdPrice(chainId, WETH)

      // THEN: The price matches the result from the proxy
      expect(price).toEqual(200)

      // THEN: The proxy has been called once
      expect(proxyMock.getUsdPrice).toHaveBeenCalledWith(chainId, WETH)

      // THEN: The value returned by the proxy is cached
      expect(redisMock.set).toHaveBeenCalledWith(
        `repos:test-cache:usd-price:${chainId}:${wethLowercase}`,
        '200',
        'EX',
        CACHE_VALUE_SECONDS
      )
    })

    it('should call the proxy if no cache, then cache the NULL', async () => {
      // GIVEN: The value is not cached
      redisMock.get.mockResolvedValue(null)

      // GIVEN: proxy returns 200
      proxyMock.getUsdPrice.mockResolvedValue(null)

      // When: Get USD price
      const price = await usdRepositoryCache.getUsdPrice(chainId, WETH)

      // THEN: The price matches the result from the proxy
      expect(price).toEqual(null)

      // THEN: The proxy has been called once
      expect(proxyMock.getUsdPrice).toHaveBeenCalledWith(chainId, WETH)

      // THEN: The value returned by the proxy is cached
      expect(redisMock.set).toHaveBeenCalledWith(
        `repos:test-cache:usd-price:${chainId}:${wethLowercase}`,
        'null',
        'EX',
        CACHE_NULL_SECONDS
      )
    })

    it('should return the cached value, even if the proxy throws', async () => {
      // GIVEN: Cached value '100'
      redisMock.get.mockResolvedValue('100')

      // GIVEN: The proxy throws an awful error
      proxyMock.getUsdPrice.mockImplementation(() => {
        throw new Error('💥 Booom!')
      })

      // When: Get USD price
      const price = await usdRepositoryCache.getUsdPrice(chainId, WETH)

      // THEN: The price matches the result from the proxy
      expect(price).toEqual(100)
      expect(proxyMock.getUsdPrice).not.toHaveBeenCalled()
    })

    it('should throw if the proxy throws and there is no cache available', async () => {
      // GIVEN: The value is not cached
      redisMock.get.mockResolvedValue(null)

      // GIVEN: The proxy throws an awful error
      proxyMock.getUsdPrice.mockImplementation(async () => {
        throw new Error('💥 Booom!')
      })

      // When: Get USD price
      const pricePromise = usdRepositoryCache.getUsdPrice(chainId, WETH)

      // THEN: The call throws an awful error
      await expect(pricePromise).rejects.toThrow('💥 Booom!')

      // THEN: The failure is remembered briefly, so an outage does not turn every request into a
      // fresh upstream call. Crucially it is NOT cached as "no price": that would hide the outage
      // behind a 404 for the whole NULL TTL, long after the upstream recovered.
      expect(redisMock.set).toHaveBeenCalledWith(expect.any(String), 'error', 'EX', CACHE_ERROR_SECONDS)
      expect(redisMock.set).not.toHaveBeenCalledWith(expect.any(String), 'null', 'EX', expect.anything())
    })

    it('should not call the proxy while a recent failure is remembered', async () => {
      // GIVEN: A failure was cached moments ago
      redisMock.get.mockResolvedValue('error')

      // GIVEN: The proxy would answer if asked
      proxyMock.getUsdPrice.mockResolvedValue(200)

      // WHEN: Get USD price
      const pricePromise = usdRepositoryCache.getUsdPrice(chainId, WETH)

      // THEN: It throws without hitting the upstream, which is the point: an outage must not turn
      // every request into a fresh upstream call. It throws rather than returning null so the
      // fallback still moves on to the next source instead of reporting "no price".
      await expect(pricePromise).rejects.toThrow('failed within the last')
      expect(proxyMock.getUsdPrice).not.toHaveBeenCalled()
    })
  })

  describe('getUsdPrices', () => {
    let pricePoint100: PricePoint
    let pricePoint200: PricePoint

    let pricePoints100String: string
    let pricePoints200String: string

    beforeAll(() => {
      pricePoint100 = {
        date: new Date('2024-01-01T00:00:00Z'),
        price: 100,
        volume: 12345,
      }
      pricePoint200 = {
        date: new Date('2024-12-31T11:59:59Z'),
        price: 200,
        volume: 67890,
      }
      pricePoints100String = JSON.stringify([pricePoint100])
      pricePoints200String = JSON.stringify([pricePoint200])
    })

    it('should return prices from cache', async () => {
      // GIVEN: cached prices
      redisMock.get.mockResolvedValue(pricePoints100String)
      proxyMock.getUsdPrices.mockResolvedValue([pricePoint200])

      // WHEN: Get USD prices
      const prices = await usdRepositoryCache.getUsdPrices(chainId, WETH, '5m')

      // THEN: We get the cached value
      expect(prices).toEqual([pricePoint100])
      expect(proxyMock.getUsdPrices).not.toHaveBeenCalled()
    })

    it('limits a response to the remaining lifetime of a cached series', async () => {
      redisMock.get.mockResolvedValue(pricePoints100String)
      redisMock.ttl.mockResolvedValue(1)

      const { cacheTtlSeconds } = await withPriceSeriesCacheTtl(300, () =>
        usdRepositoryCache.getUsdPrices(chainId, WETH, '5m')
      )

      expect(cacheTtlSeconds).toBeLessThanOrEqual(1)
      expect(proxyMock.getUsdPrices).not.toHaveBeenCalled()
    })

    it('does not extend an old series when its key is replaced between cache reads', async () => {
      redisMock.ttl.mockResolvedValue(1)
      redisMock.get.mockImplementation(async () => {
        redisMock.ttl.mockResolvedValue(300)
        return pricePoints100String
      })

      const { cacheTtlSeconds } = await withPriceSeriesCacheTtl(300, () =>
        usdRepositoryCache.getUsdPrices(chainId, WETH, '5m')
      )

      expect(cacheTtlSeconds).toBeLessThanOrEqual(1)
    })

    it('limits a fallback response to the upstream error cache lifetime', async () => {
      redisMock.get.mockResolvedValue(null)
      proxyMock.getUsdPrices.mockRejectedValue(new Error('Coingecko unavailable'))

      const { cacheTtlSeconds } = await withPriceSeriesCacheTtl(300, async () => {
        await expect(usdRepositoryCache.getUsdPrices(chainId, WETH, '5m')).rejects.toThrow('Coingecko unavailable')
      })

      expect(cacheTtlSeconds).toBeLessThanOrEqual(CACHE_ERROR_SECONDS)
    })


    it('should call the proxy if no cache, then cache the value', async () => {
      // GIVEN: The value is not cached
      redisMock.get.mockResolvedValue(null)

      // GIVEN: proxy returns 200
      proxyMock.getUsdPrices.mockResolvedValue([pricePoint200])

      // When: Get USD prices
      const prices = await usdRepositoryCache.getUsdPrices(chainId, WETH, '5m')

      // THEN: The price matches the result from the proxy
      expect(prices).toEqual([pricePoint200])

      // THEN: The proxy has been called once
      expect(proxyMock.getUsdPrices).toHaveBeenCalledWith(chainId, WETH, '5m')

      // THEN: The value returned by the proxy is cached
      expect(redisMock.set).toHaveBeenCalledWith(
        `repos:test-cache:usd-prices:${chainId}:${wethLowercase}:5m`,
        pricePoints200String,
        'EX',
        PRICE_SERIES_CACHE_SECONDS['5m']
      )
    })

    it.each(['5m', 'hourly', 'daily'] as const)(
      'caches a %s series for its own granularity, not the generic value TTL',
      async (priceStrategy) => {
        // GIVEN: The value is not cached, and the proxy answers with a series
        redisMock.get.mockResolvedValue(null)
        proxyMock.getUsdPrices.mockResolvedValue([pricePoint200])

        // WHEN: Get USD prices
        await usdRepositoryCache.getUsdPrices(chainId, WETH, priceStrategy)

        // THEN: The series is cached for that strategy's TTL
        expect(redisMock.set).toHaveBeenCalledWith(
          `repos:test-cache:usd-prices:${chainId}:${wethLowercase}:${priceStrategy}`,
          pricePoints200String,
          'EX',
          PRICE_SERIES_CACHE_SECONDS[priceStrategy]
        )

        // THEN: Never the generic value TTL
        expect(redisMock.set).not.toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          'EX',
          CACHE_VALUE_SECONDS
        )
      }
    )

    it('should call the proxy if no cache, then cache the NULL', async () => {
      // GIVEN: The value is not cached
      redisMock.get.mockResolvedValue(null)

      // GIVEN: proxy returns 200
      proxyMock.getUsdPrices.mockResolvedValue(null)

      // When: Get USD prices
      const prices = await usdRepositoryCache.getUsdPrices(chainId, WETH, '5m')

      // THEN: The price matches the result from the proxy
      expect(prices).toEqual(null)

      // THEN: The proxy has been called once
      expect(proxyMock.getUsdPrices).toHaveBeenCalledWith(chainId, WETH, '5m')

      // THEN: The value returned by the proxy is cached
      expect(redisMock.set).toHaveBeenCalledWith(
        `repos:test-cache:usd-prices:${chainId}:${wethLowercase}:5m`,
        'null',
        'EX',
        CACHE_NULL_SECONDS
      )
    })

    it('should return the cached value, even if the proxy throws', async () => {
      // GIVEN: Cached value '100'
      redisMock.get.mockResolvedValue(pricePoints100String)

      // GIVEN: The proxy throws an awful error
      proxyMock.getUsdPrices.mockImplementation(() => {
        throw new Error('💥 Booom!')
      })

      // When: Get USD price
      const prices = await usdRepositoryCache.getUsdPrices(chainId, WETH, '5m')

      // THEN: The price matches the result from the proxy
      expect(prices).toEqual([pricePoint100])
      expect(proxyMock.getUsdPrice).not.toHaveBeenCalled()
    })

    it('should throw if the proxy throws and there is no cache available', async () => {
      // GIVEN: The value is not cached
      redisMock.get.mockResolvedValue(null)

      // GIVEN: The proxy throws an awful error
      proxyMock.getUsdPrices.mockImplementation(async () => {
        throw new Error('💥 Booom!')
      })

      // When: Get USD prices
      const pricesPromise = usdRepositoryCache.getUsdPrices(chainId, WETH, '5m')

      // THEN: The call throws an awful error
      await expect(pricesPromise).rejects.toThrow('💥 Booom!')

      // THEN: Remembered briefly and not as "no price", same as the single price path
      expect(redisMock.set).toHaveBeenCalledWith(expect.any(String), 'error', 'EX', CACHE_ERROR_SECONDS)
      expect(redisMock.set).not.toHaveBeenCalledWith(expect.any(String), 'null', 'EX', expect.anything())
    })

    it('should not call the proxy while a recent failure is remembered', async () => {
      // GIVEN: A failure was cached moments ago
      redisMock.get.mockResolvedValue('error')

      // GIVEN: The proxy would answer if asked
      proxyMock.getUsdPrices.mockResolvedValue([pricePoint200])

      // WHEN: Get USD prices
      const pricesPromise = usdRepositoryCache.getUsdPrices(chainId, WETH, '5m')

      // THEN: It throws without hitting the upstream, same as the single price path
      await expect(pricesPromise).rejects.toThrow('failed within the last')
      expect(proxyMock.getUsdPrices).not.toHaveBeenCalled()
    })
  })
})
