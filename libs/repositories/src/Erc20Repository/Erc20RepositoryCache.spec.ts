import { Erc20RepositoryCache } from './Erc20RepositoryCache';
import { Erc20, Erc20Repository } from './Erc20Repository';
import { CacheRepository } from '../CacheRepository/CacheRepository';
import { SupportedChainId } from '../types';

describe('Erc20RepositoryCache', () => {
  let erc20RepositoryCache: Erc20RepositoryCache;
  let mockProxy: jest.Mocked<Erc20Repository>;
  let mockCache: jest.Mocked<CacheRepository>;

  const chainId: SupportedChainId = 1;
  const tokenAddress = '0xTokenAddress';
  const cacheName = 'erc20';
  const cacheTimeSeconds = 60;
  const cacheKey = `repos:${cacheName}:get:${chainId}:${tokenAddress.toLocaleLowerCase()}`;

  const erc20Data: Erc20 = {
    address: '0x1111111111111111111111111111111111111111',
    name: 'Token Name',
    symbol: 'TKN',
    decimals: 18,
  };

  beforeEach(() => {
    mockProxy = {
      get: jest.fn(),
    } as unknown as jest.Mocked<Erc20Repository>;

    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
    } as unknown as jest.Mocked<CacheRepository>;

    erc20RepositoryCache = new Erc20RepositoryCache(
      mockProxy,
      mockCache,
      cacheName,
      cacheTimeSeconds
    );
  });

  it('should return cached value if available', async () => {
    // GIVEN: Cached value is available
    mockCache.get.mockResolvedValue(JSON.stringify(erc20Data));

    // WHEN: get is called
    const result = await erc20RepositoryCache.get(chainId, tokenAddress);

    // THEN: The cache is called
    expect(mockCache.get).toHaveBeenCalledWith(cacheKey);

    // THEN: The proxy is not called
    expect(mockProxy.get).not.toHaveBeenCalled();

    // THEN: The cached value is returned
    expect(result).toEqual(erc20Data);
  });

  it('should return null if cached value is NULL_VALUE', async () => {
    // GIVEN: Cached value is null
    mockCache.get.mockResolvedValue('null');

    // WHEN: get is called
    const result = await erc20RepositoryCache.get(chainId, tokenAddress);

    // THEN: The cache is called
    expect(mockCache.get).toHaveBeenCalledWith(cacheKey);

    // THEN: The proxy is not called
    expect(mockProxy.get).not.toHaveBeenCalled();

    // THEN: null is returned
    expect(result).toBeNull();
  });

  it('should fetch from proxy and cache the result if not cached', async () => {
    // GIVEN: Cached value is not available
    mockCache.get.mockResolvedValue(null);

    // GIVEN: Proxy returns the value
    mockProxy.get.mockResolvedValue(erc20Data);

    // WHEN: get is called
    const result = await erc20RepositoryCache.get(chainId, tokenAddress);

    // THEN: The cache is called
    expect(mockCache.get).toHaveBeenCalledWith(cacheKey);

    // THEN: The proxy is called
    expect(mockProxy.get).toHaveBeenCalledWith(chainId, tokenAddress);

    // THEN: The value is cached
    expect(mockCache.set).toHaveBeenCalledWith(
      cacheKey,
      JSON.stringify(erc20Data),
      cacheTimeSeconds
    );

    // THEN: The value is returned
    expect(result).toEqual(erc20Data);
  });

  it('should cache NULL_VALUE if proxy returns null', async () => {
    // GIVEN: Cached value is not available
    mockCache.get.mockResolvedValue(null);

    // GIVEN: Proxy returns null
    mockProxy.get.mockResolvedValue(null);

    // WHEN: get is called
    const result = await erc20RepositoryCache.get(chainId, tokenAddress);

    // THEN: The cache is called
    expect(mockCache.get).toHaveBeenCalledWith(cacheKey);

    // THEN: The proxy is called
    expect(mockProxy.get).toHaveBeenCalledWith(chainId, tokenAddress);

    // THEN: The null value is cached
    expect(mockCache.set).toHaveBeenCalledWith(
      cacheKey,
      'null',
      cacheTimeSeconds
    );

    // THEN: The result is null
    expect(result).toBeNull();
  });
});
