import { TokenHolderRepositoryCache } from './TokenHolderRepositoryCache';
import IORedis from 'ioredis';
import { TokenHolderRepository } from './TokenHolderRepository';
import { SupportedChainId } from '@cowprotocol/shared';
import { NULL_ADDRESS, WETH } from '../../../test/mock';
import { CacheRepositoryRedis } from '../CacheRepository/CacheRepositoryRedis';

const CACHE_VALUE_SECONDS = 10;
const CACHE_NULL_SECONDS = 20;

const wethLowercase = WETH.toLocaleLowerCase();
const chainId = SupportedChainId.MAINNET;

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
  }));
});

describe('TokenHolderRepositoryCache', () => {
  let tokenHoldersRepositoryCache: TokenHolderRepositoryCache;
  let redisMock: jest.Mocked<IORedis>;
  let proxyMock: jest.Mocked<TokenHolderRepository>;

  beforeEach(() => {
    redisMock = new IORedis() as jest.Mocked<IORedis>;
    proxyMock = {
      getTopTokenHolders: jest.fn(),
    };
    const cacheRepository = new CacheRepositoryRedis(redisMock);
    tokenHoldersRepositoryCache = new TokenHolderRepositoryCache(
      proxyMock,
      cacheRepository,
      'test-cache',
      CACHE_VALUE_SECONDS,
      CACHE_NULL_SECONDS
    );
  });

  const HOLDERS_1 = [
    {
      address: NULL_ADDRESS,
      balance: '1',
    },
  ];

  const HOLDERS_2 = [
    {
      address: NULL_ADDRESS,
      balance: '2',
    },
  ];

  const HOLDERS_1_STRING = JSON.stringify(HOLDERS_1);
  const HOLDERS_2_STRING = JSON.stringify(HOLDERS_2);

  describe('getTopTokenHolders', () => {
    it('should return token holders from cache', async () => {
      // GIVEN: Cached value HOLDERS_1
      redisMock.get.mockResolvedValue(HOLDERS_1_STRING);

      // GIVEN: proxy returns HOLDERS_2
      proxyMock.getTopTokenHolders.mockResolvedValue(HOLDERS_2);

      // WHEN: Get Top Token Holders
      const topTokenHolder =
        await tokenHoldersRepositoryCache.getTopTokenHolders(chainId, WETH);

      expect(topTokenHolder).toStrictEqual(HOLDERS_1);
      expect(proxyMock.getTopTokenHolders).not.toHaveBeenCalled();
    });

    it('should return NULL from cache', async () => {
      // GIVEN: Cached value 'null'
      redisMock.get.mockResolvedValue('null');

      // GIVEN: proxy returns HOLDERS_2
      proxyMock.getTopTokenHolders.mockResolvedValue(HOLDERS_2);

      // WHEN: Get Top Token Holders
      const topTokenHolder =
        await tokenHoldersRepositoryCache.getTopTokenHolders(chainId, WETH);

      // THEN: We get the cached value
      expect(topTokenHolder).toEqual(null);
      expect(proxyMock.getTopTokenHolders).not.toHaveBeenCalled();
    });

    it('should call the proxy if no cache, then cache the value', async () => {
      // GIVEN: The value is not cached
      redisMock.get.mockResolvedValue(null);

      // GIVEN: proxy returns HOLDERS_2
      proxyMock.getTopTokenHolders.mockResolvedValue(HOLDERS_2);

      // WHEN: Get Top Token Holders
      const topTokenHolder =
        await tokenHoldersRepositoryCache.getTopTokenHolders(chainId, WETH);

      // THEN: The holders matches the result from the proxy
      expect(topTokenHolder).toStrictEqual(HOLDERS_2);

      // THEN: The proxy has been called once
      expect(proxyMock.getTopTokenHolders).toHaveBeenCalledWith(chainId, WETH);

      // THEN: The value returned by the proxy is cached
      expect(redisMock.set).toHaveBeenCalledWith(
        `repos:test-cache:usd-price:${chainId}:${wethLowercase}`,
        HOLDERS_2_STRING,
        'EX',
        CACHE_VALUE_SECONDS
      );
    });

    it('should call the proxy if no cache, then cache the NULL', async () => {
      // GIVEN: The value is not cached
      redisMock.get.mockResolvedValue(null);

      // GIVEN: proxy returns null
      proxyMock.getTopTokenHolders.mockResolvedValue(null);

      // WHEN: Get Top Token Holders
      const price = await tokenHoldersRepositoryCache.getTopTokenHolders(
        chainId,
        WETH
      );

      // THEN: The price matches the result from the proxy
      expect(price).toEqual(null);

      // THEN: The proxy has been called once
      expect(proxyMock.getTopTokenHolders).toHaveBeenCalledWith(chainId, WETH);

      // THEN: The value returned by the proxy is cached
      expect(redisMock.set).toHaveBeenCalledWith(
        `repos:test-cache:usd-price:${chainId}:${wethLowercase}`,
        'null',
        'EX',
        CACHE_NULL_SECONDS
      );
    });

    it('should return the cached value, even if the proxy throws', async () => {
      // GIVEN: Cached value HOLDERS_1_STRING
      redisMock.get.mockResolvedValue(HOLDERS_1_STRING);

      // GIVEN: The proxy throws an awful error
      proxyMock.getTopTokenHolders.mockImplementation(() => {
        throw new Error('💥 Booom!');
      });

      // WHEN: Get Top Token Holders
      const tokenHolders = await tokenHoldersRepositoryCache.getTopTokenHolders(
        chainId,
        WETH
      );

      // THEN: The holders matches the result from the proxy
      expect(tokenHolders).toStrictEqual(HOLDERS_1);
      expect(proxyMock.getTopTokenHolders).not.toHaveBeenCalled();
    });

    it('should throw if the proxy throws and there is no cache available', async () => {
      // GIVEN: The value is not cached
      redisMock.get.mockResolvedValue(null);

      // GIVEN: The proxy throws an awful error
      proxyMock.getTopTokenHolders.mockImplementation(async () => {
        throw new Error('💥 Booom!');
      });

      // WHEN: Get Top Token Holders
      const tokenHolderPromise = tokenHoldersRepositoryCache.getTopTokenHolders(
        chainId,
        WETH
      );

      // THEN: The call throws an awful error
      expect(tokenHolderPromise).rejects.toThrow('💥 Booom!');
    });
  });
});
