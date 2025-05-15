import { UsdRepositoryCache } from './UsdRepositoryCache';
import IORedis from 'ioredis';
import { UsdRepository } from './UsdRepository';
import { CacheRepositoryRedis } from '../CacheRepository/CacheRepositoryRedis';
import { SupportedChainId } from '@cowprotocol/shared';
import { WETH } from '../../../test/mock';
import type { PricePoint } from './UsdRepository';

const CACHE_VALUE_SECONDS = 10;
const CACHE_NULL_SECONDS = 20;

const wethLowercase = WETH.toLocaleLowerCase();
const chainId = SupportedChainId.MAINNET.toString();

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
  }));
});

describe('UsdRepositoryCache', () => {
  let usdRepositoryCache: UsdRepositoryCache;
  let redisMock: jest.Mocked<IORedis>;
  let proxyMock: jest.Mocked<UsdRepository>;

  beforeEach(() => {
    redisMock = new IORedis() as jest.Mocked<IORedis>;
    proxyMock = {
      getUsdPrice: jest.fn(),
      getUsdPrices: jest.fn(),
    };
    const cacheRepository = new CacheRepositoryRedis(redisMock);
    usdRepositoryCache = new UsdRepositoryCache(
      proxyMock,
      cacheRepository,
      'test-cache',
      CACHE_VALUE_SECONDS,
      CACHE_NULL_SECONDS
    );
  });

  describe('getUsdPrice', () => {
    it('should return price from cache', async () => {
      // GIVEN: Cached value '100'
      redisMock.get.mockResolvedValue('100');

      // GIVEN: proxy returns 200
      proxyMock.getUsdPrice.mockResolvedValue(200);

      // WHEN: Get USD price
      const price = await usdRepositoryCache.getUsdPrice(chainId, WETH);

      // THEN: We get the cached value
      expect(price).toEqual(100);
      expect(proxyMock.getUsdPrice).not.toHaveBeenCalled();
    });

    it('should return NULL from cache', async () => {
      // GIVEN: Cached value 'null'
      redisMock.get.mockResolvedValue('null');

      // GIVEN: proxy returns 200
      proxyMock.getUsdPrice.mockResolvedValue(200);

      // WHEN: Get USD price
      const price = await usdRepositoryCache.getUsdPrice(chainId, WETH);

      // THEN: We get the cached value
      expect(price).toEqual(null);
      expect(proxyMock.getUsdPrice).not.toHaveBeenCalled();
    });

    it('should call the proxy if no cache, then cache the value', async () => {
      // GIVEN: The value is not cached
      redisMock.get.mockResolvedValue(null);

      // GIVEN: proxy returns 200
      proxyMock.getUsdPrice.mockResolvedValue(200);

      // When: Get USD price
      const price = await usdRepositoryCache.getUsdPrice(chainId, WETH);

      // THEN: The price matches the result from the proxy
      expect(price).toEqual(200);

      // THEN: The proxy has been called once
      expect(proxyMock.getUsdPrice).toHaveBeenCalledWith(chainId, WETH);

      // THEN: The value returned by the proxy is cached
      expect(redisMock.set).toHaveBeenCalledWith(
        `repos:test-cache:usd-price:${chainId}:${wethLowercase}`,
        '200',
        'EX',
        CACHE_VALUE_SECONDS
      );
    });

    it('should call the proxy if no cache, then cache the NULL', async () => {
      // GIVEN: The value is not cached
      redisMock.get.mockResolvedValue(null);

      // GIVEN: proxy returns 200
      proxyMock.getUsdPrice.mockResolvedValue(null);

      // When: Get USD price
      const price = await usdRepositoryCache.getUsdPrice(chainId, WETH);

      // THEN: The price matches the result from the proxy
      expect(price).toEqual(null);

      // THEN: The proxy has been called once
      expect(proxyMock.getUsdPrice).toHaveBeenCalledWith(chainId, WETH);

      // THEN: The value returned by the proxy is cached
      expect(redisMock.set).toHaveBeenCalledWith(
        `repos:test-cache:usd-price:${chainId}:${wethLowercase}`,
        'null',
        'EX',
        CACHE_NULL_SECONDS
      );
    });

    it('should return the cached value, even if the proxy throws', async () => {
      // GIVEN: Cached value '100'
      redisMock.get.mockResolvedValue('100');

      // GIVEN: The proxy throws an awful error
      proxyMock.getUsdPrice.mockImplementation(() => {
        throw new Error('💥 Booom!');
      });

      // When: Get USD price
      const price = await usdRepositoryCache.getUsdPrice(chainId, WETH);

      // THEN: The price matches the result from the proxy
      expect(price).toEqual(100);
      expect(proxyMock.getUsdPrice).not.toHaveBeenCalled();
    });

    it('should throw if the proxy throws and there is no cache available', async () => {
      // GIVEN: The value is not cached
      redisMock.get.mockResolvedValue(null);

      // GIVEN: The proxy throws an awful error
      proxyMock.getUsdPrice.mockImplementation(async () => {
        throw new Error('💥 Booom!');
      });

      // When: Get USD price
      const pricePromise = usdRepositoryCache.getUsdPrice(chainId, WETH);

      // THEN: The call throws an awful error
      expect(pricePromise).rejects.toThrow('💥 Booom!');
    });
  });

  describe('getUsdPrices', () => {
    let pricePoint100: PricePoint;
    let pricePoint200: PricePoint;

    let pricePoints100String: string;
    let pricePoints200String: string;

    beforeAll(() => {
      pricePoint100 = {
        date: new Date('2024-01-01T00:00:00Z'),
        price: 100,
        volume: 12345,
      };
      pricePoint200 = {
        date: new Date('2024-12-31T11:59:59Z'),
        price: 200,
        volume: 67890,
      };
      pricePoints100String = JSON.stringify([pricePoint100]);
      pricePoints200String = JSON.stringify([pricePoint200]);
    });

    it('should return prices from cache', async () => {
      // GIVEN: cached prices
      redisMock.get.mockResolvedValue(pricePoints100String);
      proxyMock.getUsdPrices.mockResolvedValue([pricePoint200]);

      // WHEN: Get USD prices
      const prices = await usdRepositoryCache.getUsdPrices(chainId, WETH, '5m');

      // THEN: We get the cached value
      expect(prices).toEqual([pricePoint100]);
      expect(proxyMock.getUsdPrices).not.toHaveBeenCalled();
    });

    it('should call the proxy if no cache, then cache the value', async () => {
      // GIVEN: The value is not cached
      redisMock.get.mockResolvedValue(null);

      // GIVEN: proxy returns 200
      proxyMock.getUsdPrices.mockResolvedValue([pricePoint200]);

      // When: Get USD prices
      const prices = await usdRepositoryCache.getUsdPrices(chainId, WETH, '5m');

      // THEN: The price matches the result from the proxy
      expect(prices).toEqual([pricePoint200]);

      // THEN: The proxy has been called once
      expect(proxyMock.getUsdPrices).toHaveBeenCalledWith(chainId, WETH, '5m');

      // THEN: The value returned by the proxy is cached
      expect(redisMock.set).toHaveBeenCalledWith(
        `repos:test-cache:usd-prices:${chainId}:${wethLowercase}:5m`,
        pricePoints200String,
        'EX',
        CACHE_VALUE_SECONDS
      );
    });

    it('should call the proxy if no cache, then cache the NULL', async () => {
      // GIVEN: The value is not cached
      redisMock.get.mockResolvedValue(null);

      // GIVEN: proxy returns 200
      proxyMock.getUsdPrices.mockResolvedValue(null);

      // When: Get USD prices
      const prices = await usdRepositoryCache.getUsdPrices(chainId, WETH, '5m');

      // THEN: The price matches the result from the proxy
      expect(prices).toEqual(null);

      // THEN: The proxy has been called once
      expect(proxyMock.getUsdPrices).toHaveBeenCalledWith(chainId, WETH, '5m');

      // THEN: The value returned by the proxy is cached
      expect(redisMock.set).toHaveBeenCalledWith(
        `repos:test-cache:usd-prices:${chainId}:${wethLowercase}:5m`,
        'null',
        'EX',
        CACHE_NULL_SECONDS
      );
    });

    it('should return the cached value, even if the proxy throws', async () => {
      // GIVEN: Cached value '100'
      redisMock.get.mockResolvedValue(pricePoints100String);

      // GIVEN: The proxy throws an awful error
      proxyMock.getUsdPrices.mockImplementation(() => {
        throw new Error('💥 Booom!');
      });

      // When: Get USD price
      const prices = await usdRepositoryCache.getUsdPrices(chainId, WETH, '5m');

      // THEN: The price matches the result from the proxy
      expect(prices).toEqual([pricePoint100]);
      expect(proxyMock.getUsdPrice).not.toHaveBeenCalled();
    });

    it('should throw if the proxy throws and there is no cache available', async () => {
      // GIVEN: The value is not cached
      redisMock.get.mockResolvedValue(null);

      // GIVEN: The proxy throws an awful error
      proxyMock.getUsdPrices.mockImplementation(async () => {
        throw new Error('💥 Booom!');
      });

      // When: Get USD prices
      const pricesPromise = usdRepositoryCache.getUsdPrices(
        chainId,
        WETH,
        '5m'
      );

      // THEN: The call throws an awful error
      expect(pricesPromise).rejects.toThrow('💥 Booom!');
    });
  });
});
