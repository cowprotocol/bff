import { TokenHolderRepositoryCache } from './TokenHolderRepositoryCache';
import {
  TokenHolderPoint,
  TokenHolderRepository,
} from './TokenHolderRepository';
import { CacheRepository } from '../CacheRepository/CacheRepository';
import { SupportedChainId } from '@cowprotocol/shared';

describe('TokenHolderRepositoryCache', () => {
  let tokeHolderRepositoryCache: TokenHolderRepositoryCache;
  let mockProxy: jest.Mocked<TokenHolderRepository>;
  let mockCache: jest.Mocked<CacheRepository>;

  const chainId = SupportedChainId.MAINNET;
  const tokenAddress = '0xTokenAddress';
  const cacheName = 'token-holders';
  const cacheTimeSeconds = 60 * 60 * 24;
  const cacheKey = `repos:${cacheName}:get:${chainId}:${tokenAddress.toLocaleLowerCase()}`;

  const tokeHolderPoint: TokenHolderPoint[] = [
    {
      address: '0x1111111111111111111111111111111111111111',
      balance: '1000000000',
    },
  ];

  beforeEach(() => {
    mockProxy = {
      getTopTokenHolders: jest.fn(),
    } as unknown as jest.Mocked<TokenHolderRepository>;

    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
    } as unknown as jest.Mocked<CacheRepository>;

    tokeHolderRepositoryCache = new TokenHolderRepositoryCache(
      mockProxy,
      mockCache,
      cacheName,
      cacheTimeSeconds
    );
  });

  it('should return cached value if available', async () => {
    // GIVEN: Cached value is available
    mockCache.get.mockResolvedValue(JSON.stringify(tokeHolderPoint));

    // WHEN: get is called
    const result = await tokeHolderRepositoryCache.getTopTokenHolders(
      chainId,
      tokenAddress
    );

    // THEN: The cache is called
    expect(mockCache.get).toHaveBeenCalledWith(cacheKey);

    // THEN: The proxy is not called
    expect(mockProxy.getTopTokenHolders).not.toHaveBeenCalled();

    // THEN: The cached value is returned
    expect(result).toEqual(tokeHolderPoint);
  });

  it('should return null if cached value is NULL_VALUE', async () => {
    // GIVEN: Cached value is null
    mockCache.get.mockResolvedValue('null');

    // WHEN: get is called
    const result = await tokeHolderRepositoryCache.getTopTokenHolders(
      chainId,
      tokenAddress
    );

    // THEN: The cache is called
    expect(mockCache.get).toHaveBeenCalledWith(cacheKey);

    // THEN: The proxy is not called
    expect(mockProxy.getTopTokenHolders).not.toHaveBeenCalled();

    // THEN: null is returned
    expect(result).toBeNull();
  });

  it('should fetch from proxy and cache the result if not cached', async () => {
    // GIVEN: Cached value is not available
    mockCache.get.mockResolvedValue(null);

    // GIVEN: Proxy returns the value
    mockProxy.getTopTokenHolders.mockResolvedValue(tokeHolderPoint);

    // WHEN: get is called
    const result = await tokeHolderRepositoryCache.getTopTokenHolders(
      chainId,
      tokenAddress
    );

    // THEN: The cache is called
    expect(mockCache.get).toHaveBeenCalledWith(cacheKey);

    // THEN: The proxy is called
    expect(mockProxy.getTopTokenHolders).toHaveBeenCalledWith(
      chainId,
      tokenAddress
    );

    // THEN: The value is cached
    expect(mockCache.set).toHaveBeenCalledWith(
      cacheKey,
      JSON.stringify(tokeHolderPoint),
      cacheTimeSeconds
    );

    // THEN: The value is returned
    expect(result).toEqual(tokeHolderPoint);
  });

  it('should cache NULL_VALUE if proxy returns null', async () => {
    // GIVEN: Cached value is not available
    mockCache.get.mockResolvedValue(null);

    // GIVEN: Proxy returns null
    mockProxy.getTopTokenHolders.mockResolvedValue(null);

    // WHEN: get is called
    const result = await tokeHolderRepositoryCache.getTopTokenHolders(
      chainId,
      tokenAddress
    );

    // THEN: The cache is called
    expect(mockCache.get).toHaveBeenCalledWith(cacheKey);

    // THEN: The proxy is called
    expect(mockProxy.getTopTokenHolders).toHaveBeenCalledWith(
      chainId,
      tokenAddress
    );

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
