import { UsdRepositoryRedis } from './UsdRepositoryRedis';
import IORedis from 'ioredis';
import { PriceStrategy, UsdRepository } from './UsdRepository';
import { SupportedChainId } from '../types';
import { WETH } from '../../test/mock';

const CACHE_TIME_SECONDS = 10;

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
  }));
});

describe('UsdRepositoryRedis', () => {
  let usdRepositoryRedis: UsdRepositoryRedis;
  let redisMock: jest.Mocked<IORedis>;
  let proxyMock: jest.Mocked<UsdRepository>;

  beforeEach(() => {
    redisMock = new IORedis() as jest.Mocked<IORedis>;
    proxyMock = {
      getUsdPrice: jest.fn(),
      getUsdPrices: jest.fn(),
    };
    usdRepositoryRedis = new UsdRepositoryRedis(
      proxyMock,
      redisMock,
      'testCache',
      CACHE_TIME_SECONDS
    );
  });

  describe('getUsdPrice', () => {
    it('should return price from cache if available', async () => {
      // GIVEN: Cached value '100'
      // GIVEN: proxy returns 200
      redisMock.get.mockResolvedValue('100');
      proxyMock.getUsdPrice.mockResolvedValue(200);

      // WHEN: Get USD price
      const price = await usdRepositoryRedis.getUsdPrice(
        SupportedChainId.MAINNET,
        WETH
      );

      // THEN: We get the cached value
      expect(price).toEqual(100);
      expect(proxyMock.getUsdPrice).not.toHaveBeenCalled();
    });

    it('should return price from cache if available', async () => {
      // GIVEN: Cached value 'null'
      // GIVEN: proxy returns 200
      redisMock.get.mockResolvedValue('null');
      proxyMock.getUsdPrice.mockResolvedValue(200);

      // WHEN: Get USD price
      const price = await usdRepositoryRedis.getUsdPrice(
        SupportedChainId.MAINNET,
        WETH
      );

      // THEN: We get the cached value
      expect(price).toEqual(null);
      expect(proxyMock.getUsdPrice).not.toHaveBeenCalled();
    });

    it('should do a delegate code if no cache, then cache for the specified number of seconds', async () => {
      // GIVEN: The value is not cached
      // GIVEN: proxy returns 200
      redisMock.get.mockResolvedValue(null);
      proxyMock.getUsdPrice.mockResolvedValue(200);

      // When: Get USD price
      const price = await usdRepositoryRedis.getUsdPrice(
        SupportedChainId.MAINNET,
        WETH
      );

      // THEN: The price matches the result from the proxy
      expect(price).toEqual(200);

      // THEN: The proxy has been called once
      expect(proxyMock.getUsdPrice).toHaveBeenCalledWith(
        SupportedChainId.MAINNET,
        WETH
      );

      // THEN: The value returned by the proxy is cached
      expect(redisMock.set).toHaveBeenCalledWith(
        `repos:usdPrice:testCache:${SupportedChainId.MAINNET}:${WETH}`,
        '200',
        'EX',
        CACHE_TIME_SECONDS
      );
    });

    it('should return the cached value, even if the proxy throws', async () => {
      // GIVEN: Cached value '100'
      // GIVEN: proxy returns 200
      redisMock.get.mockResolvedValue('100');
      proxyMock.getUsdPrice.mockImplementation(() => {
        throw new Error('💥 Booom!');
      });

      // When: Get USD price
      const price = await usdRepositoryRedis.getUsdPrice(
        SupportedChainId.MAINNET,
        WETH
      );

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
      const pricePromise = usdRepositoryRedis.getUsdPrice(
        SupportedChainId.MAINNET,
        WETH
      );

      // THEN: The call throws an awful error
      expect(pricePromise).rejects.toThrow('💥 Booom!');
    });
  });
});

//   describe('getUsdPrices', () => {
//     it('should return prices from cache if available', async () => {
//       const cachedPrices = JSON.stringify([{ price: 100, timestamp: 123456 }]);
//       mockRedisClient.get.mockResolvedValue(cachedPrices);
//       const prices = await usdRepositoryRedis.getUsdPrices(
//         SupportedChainId.MAINNET,
//         WETH,
//         PriceStrategy.5m
//       );
//       expect(prices).toEqual([{ price: 100, timestamp: 123456 }]);
//       expect(mockProxy.getUsdPrices).not.toHaveBeenCalled();
//     });

//     it('should fetch, cache, and return prices if not in cache', async () => {
//       mockRedisClient.get.mockResolvedValue(null);
//       const fetchedPrices = [{ price: 200, timestamp: 123456 }];
//       mockProxy.getUsdPrices.mockResolvedValue(fetchedPrices);
//       const prices = await usdRepositoryRedis.getUsdPrices(
//         SupportedChainId.MAINNET,
//         WETH
//         PriceStrategy.hour
//       );
//       expect(prices).toEqual(fetchedPrices);
//       expect(mockRedisClient.set).toHaveBeenCalledWith(
//         expect.any(String),
//         JSON.stringify(fetchedPrices),
//         'EX',
//         120
//       );
//     });
//   });
// });
