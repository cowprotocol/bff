import { UsdRepositoryRedis } from './UsdRepositoryRedis';
import IORedis from 'ioredis';
import { PriceStrategy, UsdRepository } from './UsdRepository';
import { SupportedChainId } from '../types';
import { WETH } from '../../test/mock';

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
  }));
});

describe('UsdRepositoryRedis', () => {
  let usdRepositoryRedis: UsdRepositoryRedis;
  let mockRedisClient: jest.Mocked<IORedis>;
  let mockProxy: jest.Mocked<UsdRepository>;

  beforeEach(() => {
    mockRedisClient = new IORedis() as jest.Mocked<IORedis>;
    mockProxy = {
      getUsdPrice: jest.fn(),
      getUsdPrices: jest.fn(),
    };
    usdRepositoryRedis = new UsdRepositoryRedis(
      mockProxy,
      mockRedisClient,
      'testCache',
      120
    );
  });

  describe('getUsdPrice', () => {
    it('should return price from cache if available', async () => {
      mockRedisClient.get.mockResolvedValue('100');
      const price = await usdRepositoryRedis.getUsdPrice(
        SupportedChainId.MAINNET,
        WETH
      );
      expect(price).toEqual(100);
      expect(mockProxy.getUsdPrice).not.toHaveBeenCalled();
    });

    it('should fetch, cache, and return price if not in cache', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockProxy.getUsdPrice.mockResolvedValue(200);
      const price = await usdRepositoryRedis.getUsdPrice(
        SupportedChainId.MAINNET,
        WETH
      );
      expect(price).toEqual(200);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        expect.any(String),
        '200',
        'EX',
        120
      );
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
