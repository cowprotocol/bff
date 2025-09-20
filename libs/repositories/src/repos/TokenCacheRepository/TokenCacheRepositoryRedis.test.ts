import { SupportedChainId } from '@cowprotocol/cow-sdk';
import { Redis } from 'ioredis';
import { TokenFromAPI } from '../../datasources/tokenSearch/types';
import { TokenCacheRepositoryRedis } from './TokenCacheRepositoryRedis';

const mockTokens: TokenFromAPI[] = [
  {
    chainId: SupportedChainId.MAINNET,
    address: '0xA0b86a33E6441b8A7a6c5B3e8a8b7c9a0b86a33E',
    name: 'Test Token',
    symbol: 'TEST',
    decimals: 18,
    logoURI: 'https://example.com/test.png',
  },
  {
    chainId: SupportedChainId.MAINNET,
    address: '0xB0b86a33E6441b8A7a6c5B3e8a8b7c9a0b86a33F',
    name: 'Another Token',
    symbol: 'ANOT',
    decimals: 6,
    logoURI: 'https://example.com/another.png',
  },
  {
    chainId: SupportedChainId.MAINNET,
    address: '0xC0b86a33E6441b8A7a6c5B3e8a8b7c9a0b86a33G',
    name: 'Ethereum Token',
    symbol: 'ETH',
    decimals: 18,
    logoURI: 'https://example.com/eth.png',
  },
];

const mockRedisClient = {
  del: jest.fn(),
  hset: jest.fn(),
  expire: jest.fn(),
  hgetall: jest.fn(),
  hdel: jest.fn(),
} as unknown as jest.Mocked<Redis>;

const consoleSpy = {
  log: jest.spyOn(console, 'log').mockImplementation(),
  warn: jest.spyOn(console, 'warn').mockImplementation(),
};

describe('TokenCacheRepositoryRedis', () => {
  let repository: TokenCacheRepositoryRedis;
  const chainId = SupportedChainId.MAINNET;
  const expectedKey = `tokens:${chainId}`;

  beforeEach(() => {
    repository = new TokenCacheRepositoryRedis(mockRedisClient);
    jest.clearAllMocks();
    consoleSpy.log.mockClear();
    consoleSpy.warn.mockClear();
  });

  afterAll(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.warn.mockRestore();
  });

  describe('initTokenList', () => {
    it('should initialize token list with default TTL', async () => {
      mockRedisClient.del.mockResolvedValue(1);
      mockRedisClient.hset.mockResolvedValue(0);
      mockRedisClient.expire.mockResolvedValue(1);

      await repository.initTokenList(chainId, mockTokens);

      expect(mockRedisClient.del).toHaveBeenCalledWith(expectedKey);
      expect(mockRedisClient.hset).toHaveBeenCalledWith(expectedKey, {
        '0xa0b86a33e6441b8a7a6c5b3e8a8b7c9a0b86a33e': JSON.stringify(
          mockTokens[0]
        ),
        '0xb0b86a33e6441b8a7a6c5b3e8a8b7c9a0b86a33f': JSON.stringify(
          mockTokens[1]
        ),
        '0xc0b86a33e6441b8a7a6c5b3e8a8b7c9a0b86a33g': JSON.stringify(
          mockTokens[2]
        ),
      });
      expect(mockRedisClient.expire).toHaveBeenCalledWith(
        expectedKey,
        24 * 60 * 60
      );
    });

    it('should initialize token list with custom TTL', async () => {
      mockRedisClient.del.mockResolvedValue(1);
      mockRedisClient.hset.mockResolvedValue(0);
      mockRedisClient.expire.mockResolvedValue(1);

      const customTtl = 60 * 60; // 1 hour
      await repository.initTokenList(chainId, mockTokens, customTtl);

      expect(mockRedisClient.del).toHaveBeenCalledWith(expectedKey);
      expect(mockRedisClient.hset).toHaveBeenCalledWith(expectedKey, {
        '0xa0b86a33e6441b8a7a6c5b3e8a8b7c9a0b86a33e': JSON.stringify(
          mockTokens[0]
        ),
        '0xb0b86a33e6441b8a7a6c5b3e8a8b7c9a0b86a33f': JSON.stringify(
          mockTokens[1]
        ),
        '0xc0b86a33e6441b8a7a6c5b3e8a8b7c9a0b86a33g': JSON.stringify(
          mockTokens[2]
        ),
      });
      expect(mockRedisClient.expire).toHaveBeenCalledWith(
        expectedKey,
        customTtl
      );
    });

    it('should handle empty token list', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await repository.initTokenList(chainId, []);

      expect(mockRedisClient.del).toHaveBeenCalledWith(expectedKey);
      expect(mockRedisClient.hset).not.toHaveBeenCalled();
      expect(mockRedisClient.expire).not.toHaveBeenCalled();
    });

    it('should normalize addresses to lowercase', async () => {
      mockRedisClient.del.mockResolvedValue(1);
      mockRedisClient.hset.mockResolvedValue(0);
      mockRedisClient.expire.mockResolvedValue(1);

      const tokenWithUppercaseAddress: TokenFromAPI = {
        ...mockTokens[0],
        address: '0xA0B86A33E6441B8A7A6C5B3E8A8B7C9A0B86A33E', // Uppercase
      };

      await repository.initTokenList(chainId, [tokenWithUppercaseAddress]);

      expect(mockRedisClient.hset).toHaveBeenCalledWith(expectedKey, {
        '0xa0b86a33e6441b8a7a6c5b3e8a8b7c9a0b86a33e': JSON.stringify(
          tokenWithUppercaseAddress
        ),
      });
    });
  });

  describe('getTokenList', () => {
    it('should return tokens from cache', async () => {
      const hashData = {
        '0xa0b86a33e6441b8a7a6c5b3e8a8b7c9a0b86a33e': JSON.stringify(
          mockTokens[0]
        ),
        '0xb0b86a33e6441b8a7a6c5b3e8a8b7c9a0b86a33f': JSON.stringify(
          mockTokens[1]
        ),
      };
      mockRedisClient.hgetall.mockResolvedValue(hashData);

      const result = await repository.getTokenList(chainId);

      expect(mockRedisClient.hgetall).toHaveBeenCalledWith(expectedKey);
      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([mockTokens[0], mockTokens[1]])
      );
    });

    it('should return null when cache is empty', async () => {
      mockRedisClient.hgetall.mockResolvedValue({});

      const result = await repository.getTokenList(chainId);

      expect(mockRedisClient.hgetall).toHaveBeenCalledWith(expectedKey);
      expect(result).toBeNull();
    });

    it('should return null when cache returns null', async () => {
      mockRedisClient.hgetall.mockResolvedValue(
        null as unknown as Record<string, string>
      );

      const result = await repository.getTokenList(chainId);

      expect(mockRedisClient.hgetall).toHaveBeenCalledWith(expectedKey);
      expect(result).toBeNull();
    });

    it('should handle JSON parsing errors and remove invalid entries', async () => {
      const hashData = {
        '0xa0b86a33e6441b8a7a6c5b3e8a8b7c9a0b86a33e': JSON.stringify(
          mockTokens[0]
        ),
        '0xb0b86a33e6441b8a7a6c5b3e8a8b7c9a0b86a33f': 'invalid-json',
        '0xc0b86a33e6441b8a7a6c5b3e8a8b7c9a0b86a33g': JSON.stringify(
          mockTokens[2]
        ),
      };
      mockRedisClient.hgetall.mockResolvedValue(hashData);
      mockRedisClient.hdel.mockResolvedValue(1);

      const result = await repository.getTokenList(chainId);

      expect(mockRedisClient.hgetall).toHaveBeenCalledWith(expectedKey);
      expect(mockRedisClient.hdel).toHaveBeenCalledWith(
        expectedKey,
        '0xb0b86a33e6441b8a7a6c5b3e8a8b7c9a0b86a33f'
      );
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        'Failed to parse token data for address 0xb0b86a33e6441b8a7a6c5b3e8a8b7c9a0b86a33f, removed from cache'
      );
      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([mockTokens[0], mockTokens[2]])
      );
    });

    it('should return null when all entries are invalid JSON', async () => {
      const hashData = {
        '0xa0b86a33e6441b8a7a6c5b3e8a8b7c9a0b86a33e': 'invalid-json-1',
        '0xb0b86a33e6441b8a7a6c5b3e8a8b7c9a0b86a33f': 'invalid-json-2',
      };
      mockRedisClient.hgetall.mockResolvedValue(hashData);
      mockRedisClient.hdel.mockResolvedValue(1);

      const result = await repository.getTokenList(chainId);

      expect(mockRedisClient.hdel).toHaveBeenCalledTimes(2);
      expect(result).toBeNull();
    });

    it('should handle Redis errors and return null', async () => {
      const error = new Error('Redis connection failed');
      mockRedisClient.hgetall.mockRejectedValue(error);

      const result = await repository.getTokenList(chainId);

      expect(mockRedisClient.hgetall).toHaveBeenCalledWith(expectedKey);
      expect(consoleSpy.log).toHaveBeenCalledWith(
        'redis getTokenList 5 ==>',
        error
      );
      expect(result).toBeNull();
    });
  });

  describe('searchTokens', () => {
    beforeEach(() => {
      const hashData = {
        '0xa0b86a33e6441b8a7a6c5b3e8a8b7c9a0b86a33e': JSON.stringify(
          mockTokens[0]
        ),
        '0xb0b86a33e6441b8a7a6c5b3e8a8b7c9a0b86a33f': JSON.stringify(
          mockTokens[1]
        ),
        '0xc0b86a33e6441b8a7a6c5b3e8a8b7c9a0b86a33g': JSON.stringify(
          mockTokens[2]
        ),
      };
      mockRedisClient.hgetall.mockResolvedValue(hashData);
    });

    it('should search tokens by name (case insensitive)', async () => {
      const result = await repository.searchTokens(chainId, 'test');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockTokens[0]);
    });

    it('should search tokens by symbol (case insensitive)', async () => {
      const result = await repository.searchTokens(chainId, 'eth');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockTokens[2]);
    });

    it('should search tokens by address (case insensitive)', async () => {
      const result = await repository.searchTokens(
        chainId,
        '0xA0b86a33E6441b8A7a6c5B3e8a8b7c9a0b86a33E'
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockTokens[0]);
    });

    it('should search tokens by partial address', async () => {
      const result = await repository.searchTokens(chainId, '0xA0b86a33E');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockTokens[0]);
    });

    it('should search tokens by partial name', async () => {
      const result = await repository.searchTokens(chainId, 'token');

      expect(result).toHaveLength(3);
      expect(result).toEqual(expect.arrayContaining(mockTokens));
    });

    it('should handle search with leading/trailing whitespace', async () => {
      const result = await repository.searchTokens(chainId, '  TEST  ');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockTokens[0]);
    });

    it('should return empty array when no tokens match', async () => {
      const result = await repository.searchTokens(chainId, 'nonexistent');

      expect(result).toHaveLength(0);
    });

    it('should return empty array when token list is null', async () => {
      mockRedisClient.hgetall.mockResolvedValue({});

      const result = await repository.searchTokens(chainId, 'test');

      expect(result).toHaveLength(0);
    });

    it('should handle empty search parameter', async () => {
      const result = await repository.searchTokens(chainId, '');

      expect(result).toHaveLength(3);
      expect(result).toEqual(expect.arrayContaining(mockTokens));
    });

    it('should handle whitespace-only search parameter', async () => {
      const result = await repository.searchTokens(chainId, '   ');

      expect(result).toHaveLength(3);
      expect(result).toEqual(expect.arrayContaining(mockTokens));
    });
  });

  describe('clearTokenList', () => {
    it('should clear token list for specified chain', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await repository.clearTokenList(chainId);

      expect(mockRedisClient.del).toHaveBeenCalledWith(expectedKey);
    });

    it('should handle Redis errors when clearing', async () => {
      const error = new Error('Redis delete failed');
      mockRedisClient.del.mockRejectedValue(error);

      await expect(repository.clearTokenList(chainId)).rejects.toThrow(
        'Redis delete failed'
      );
    });
  });

  describe('key generation', () => {
    it('should generate correct keys for different chain IDs', async () => {
      const chains = [
        SupportedChainId.MAINNET,
        SupportedChainId.GNOSIS_CHAIN,
        SupportedChainId.ARBITRUM_ONE,
      ];

      mockRedisClient.del.mockResolvedValue(1);

      for (const chain of chains) {
        await repository.clearTokenList(chain);
        expect(mockRedisClient.del).toHaveBeenCalledWith(`tokens:${chain}`);
      }
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete workflow: init -> get -> search -> clear', async () => {
      mockRedisClient.del.mockResolvedValue(1);
      mockRedisClient.hset.mockResolvedValue(0);
      mockRedisClient.expire.mockResolvedValue(1);
      await repository.initTokenList(chainId, mockTokens);

      const hashData = {
        '0xa0b86a33e6441b8a7a6c5b3e8a8b7c9a0b86a33e': JSON.stringify(
          mockTokens[0]
        ),
        '0xb0b86a33e6441b8a7a6c5b3e8a8b7c9a0b86a33f': JSON.stringify(
          mockTokens[1]
        ),
        '0xc0b86a33e6441b8a7a6c5b3e8a8b7c9a0b86a33g': JSON.stringify(
          mockTokens[2]
        ),
      };
      mockRedisClient.hgetall.mockResolvedValue(hashData);
      const tokens = await repository.getTokenList(chainId);
      expect(tokens).toHaveLength(3);

      const searchResults = await repository.searchTokens(chainId, 'test');
      expect(searchResults).toHaveLength(1);

      await repository.clearTokenList(chainId);
      expect(mockRedisClient.del).toHaveBeenCalledTimes(2);
    });
  });
});
