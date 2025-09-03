import { SupportedChainId } from '@cowprotocol/cow-sdk';
import { TokenCacheRepository } from '../../repos/TokenCacheRepository';
import {
  getTokenListBySearchParam,
  initTokenList,
  setTokenCacheRepository,
} from './tokenList';
import { TokenFromAPI } from './types';

const mockTokenCacheRepository: jest.Mocked<TokenCacheRepository> = {
  initTokenList: jest.fn(),
  getTokenList: jest.fn(),
  searchTokens: jest.fn(),
  hasTokenList: jest.fn(),
  clearTokenList: jest.fn(),
};

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('tokenList', () => {
  const mockTokensResponse = {
    tokens: [
      {
        chainId: SupportedChainId.MAINNET,
        address: '0xa0b86a33e6441d08b8b3f4b89b0e1e9b1b1c1d1e',
        name: 'Uniswap',
        symbol: 'UNI',
        decimals: 18,
        logoURI: 'https://example.com/uni.png',
      },
      {
        chainId: SupportedChainId.MAINNET,
        address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
        name: 'Tether USD',
        symbol: 'USDT',
        decimals: 6,
        logoURI: 'https://example.com/usdt.png',
      },
    ] as TokenFromAPI[],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();

    setTokenCacheRepository(mockTokenCacheRepository);

    Object.values(mockTokenCacheRepository).forEach((mock) => mock.mockReset());
  });

  describe('initTokenList', () => {
    it('should fetch tokens and cache them when not already cached', async () => {
      mockTokenCacheRepository.hasTokenList.mockResolvedValue(false);

      // Setup mock responses
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokensResponse),
      });

      await initTokenList(SupportedChainId.MAINNET);

      expect(mockTokenCacheRepository.hasTokenList).toHaveBeenCalledWith(
        SupportedChainId.MAINNET
      );
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://tokens.coingecko.com/ethereum/all.json'
      );
      expect(mockTokenCacheRepository.initTokenList).toHaveBeenCalledWith(
        SupportedChainId.MAINNET,
        expect.arrayContaining([
          expect.objectContaining({
            chainId: SupportedChainId.MAINNET,
            address: '0xa0b86a33e6441d08b8b3f4b89b0e1e9b1b1c1d1e',
            name: 'Uniswap',
            symbol: 'UNI',
          }),
        ])
      );
    });

    it('should skip fetching when tokens are already cached', async () => {
      mockTokenCacheRepository.hasTokenList.mockResolvedValue(true);

      await initTokenList(SupportedChainId.MAINNET);

      expect(mockTokenCacheRepository.hasTokenList).toHaveBeenCalledWith(
        SupportedChainId.MAINNET
      );
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockTokenCacheRepository.initTokenList).not.toHaveBeenCalled();
    });

    it('should handle fetch errors gracefully', async () => {
      mockTokenCacheRepository.hasTokenList.mockResolvedValue(false);
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(initTokenList(SupportedChainId.MAINNET)).rejects.toThrow(
        'Network error'
      );

      expect(mockTokenCacheRepository.hasTokenList).toHaveBeenCalledWith(
        SupportedChainId.MAINNET
      );
      expect(mockTokenCacheRepository.initTokenList).not.toHaveBeenCalled();
    });

    it('should handle invalid JSON responses', async () => {
      mockTokenCacheRepository.hasTokenList.mockResolvedValue(false);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      await expect(initTokenList(SupportedChainId.MAINNET)).rejects.toThrow(
        'Invalid JSON'
      );

      expect(mockTokenCacheRepository.hasTokenList).toHaveBeenCalledWith(
        SupportedChainId.MAINNET
      );
      expect(mockTokenCacheRepository.initTokenList).not.toHaveBeenCalled();
    });

    it('should handle responses without tokens array', async () => {
      mockTokenCacheRepository.hasTokenList.mockResolvedValue(false);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalidStructure: true }),
      });

      await expect(initTokenList(SupportedChainId.MAINNET)).rejects.toThrow(
        'Invalid token list format from https://tokens.coingecko.com/ethereum/all.json: missing or invalid tokens array'
      );

      expect(mockTokenCacheRepository.hasTokenList).toHaveBeenCalledWith(
        SupportedChainId.MAINNET
      );
      expect(mockTokenCacheRepository.initTokenList).not.toHaveBeenCalled();
    });

    it('should handle HTTP errors', async () => {
      mockTokenCacheRepository.hasTokenList.mockResolvedValue(false);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(initTokenList(SupportedChainId.MAINNET)).rejects.toThrow(
        'Failed to fetch tokens from https://tokens.coingecko.com/ethereum/all.json: 404 Not Found'
      );

      expect(mockTokenCacheRepository.hasTokenList).toHaveBeenCalledWith(
        SupportedChainId.MAINNET
      );
      expect(mockTokenCacheRepository.initTokenList).not.toHaveBeenCalled();
    });

    it('should cache empty token arrays when fetch returns no tokens', async () => {
      mockTokenCacheRepository.hasTokenList.mockResolvedValue(false);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ tokens: [] }),
      });

      await initTokenList(SupportedChainId.MAINNET);

      expect(mockTokenCacheRepository.hasTokenList).toHaveBeenCalledWith(
        SupportedChainId.MAINNET
      );
      expect(mockTokenCacheRepository.initTokenList).toHaveBeenCalledWith(
        SupportedChainId.MAINNET,
        []
      );
    });
  });

  describe('getTokenListBySearchParam', () => {
    const mockSearchResults: TokenFromAPI[] = [
      {
        chainId: SupportedChainId.MAINNET,
        address: '0xa0b86a33e6441d08b8b3f4b89b0e1e9b1b1c1d1e',
        name: 'Uniswap',
        symbol: 'UNI',
        decimals: 18,
        logoURI: 'https://example.com/uni.png',
      },
    ];

    it('should delegate search to TokenCacheRepository', async () => {
      mockTokenCacheRepository.searchTokens.mockResolvedValue(
        mockSearchResults
      );

      const result = await getTokenListBySearchParam(
        SupportedChainId.MAINNET,
        'uni'
      );

      expect(mockTokenCacheRepository.searchTokens).toHaveBeenCalledWith(
        SupportedChainId.MAINNET,
        'uni'
      );
      expect(result).toEqual(mockSearchResults);
    });

    it('should return results from cache repository', async () => {
      mockTokenCacheRepository.searchTokens.mockResolvedValue(
        mockSearchResults
      );

      const result = await getTokenListBySearchParam(
        SupportedChainId.MAINNET,
        'test'
      );

      expect(result).toEqual(mockSearchResults);
    });

    it('should handle empty search results', async () => {
      mockTokenCacheRepository.searchTokens.mockResolvedValue([]);

      const result = await getTokenListBySearchParam(
        SupportedChainId.MAINNET,
        'nonexistent'
      );

      expect(result).toEqual([]);
    });

    it('should handle different chain IDs', async () => {
      mockTokenCacheRepository.searchTokens.mockResolvedValue([]);

      await getTokenListBySearchParam(SupportedChainId.GNOSIS_CHAIN, 'wxdai');

      expect(mockTokenCacheRepository.searchTokens).toHaveBeenCalledWith(
        SupportedChainId.GNOSIS_CHAIN,
        'wxdai'
      );
    });

    it('should handle empty search parameters', async () => {
      mockTokenCacheRepository.searchTokens.mockResolvedValue([]);

      await getTokenListBySearchParam(SupportedChainId.MAINNET, '');

      expect(mockTokenCacheRepository.searchTokens).toHaveBeenCalledWith(
        SupportedChainId.MAINNET,
        ''
      );
    });

    it('should handle special characters in search parameters', async () => {
      const searchParam = '0xabc123!@#$%^&*()';
      mockTokenCacheRepository.searchTokens.mockResolvedValue([]);

      await getTokenListBySearchParam(SupportedChainId.MAINNET, searchParam);

      expect(mockTokenCacheRepository.searchTokens).toHaveBeenCalledWith(
        SupportedChainId.MAINNET,
        searchParam
      );
    });

    it('should handle very long search parameters', async () => {
      const longSearchParam = 'a'.repeat(1000);
      mockTokenCacheRepository.searchTokens.mockResolvedValue([]);

      await getTokenListBySearchParam(
        SupportedChainId.MAINNET,
        longSearchParam
      );

      expect(mockTokenCacheRepository.searchTokens).toHaveBeenCalledWith(
        SupportedChainId.MAINNET,
        longSearchParam
      );
    });
  });

  describe('integration with real token data structure', () => {
    it('should properly process token data with all required fields', async () => {
      mockTokenCacheRepository.hasTokenList.mockResolvedValue(false);

      const completeTokenResponse = {
        tokens: [
          {
            address: '0xa0b86a33e6441d08b8b3f4b89b0e1e9b1b1c1d1e',
            name: 'Uniswap',
            symbol: 'UNI',
            decimals: 18,
            logoURI: 'https://example.com/uni.png',
          },
          {
            address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
            name: 'Tether USD',
            symbol: 'USDT',
            decimals: 6,
            logoURI: 'https://example.com/usdt.png',
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(completeTokenResponse),
      });

      await initTokenList(SupportedChainId.MAINNET);

      expect(mockTokenCacheRepository.initTokenList).toHaveBeenCalledWith(
        SupportedChainId.MAINNET,
        expect.arrayContaining([
          expect.objectContaining({
            chainId: SupportedChainId.MAINNET,
            address: '0xa0b86a33e6441d08b8b3f4b89b0e1e9b1b1c1d1e',
            name: 'Uniswap',
            symbol: 'UNI',
            decimals: 18,
            logoURI: 'https://example.com/uni.png',
          }),
          expect.objectContaining({
            chainId: SupportedChainId.MAINNET,
            address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
            name: 'Tether USD',
            symbol: 'USDT',
            decimals: 6,
            logoURI: 'https://example.com/usdt.png',
          }),
        ])
      );
    });

    it('should handle token data with optional fields missing', async () => {
      mockTokenCacheRepository.hasTokenList.mockResolvedValue(false);

      const minimalTokenResponse = {
        tokens: [
          {
            address: '0xa0b86a33e6441d08b8b3f4b89b0e1e9b1b1c1d1e',
            name: 'Minimal Token',
            symbol: 'MIN',
            decimals: 18,
            // logoURI is optional and missing
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(minimalTokenResponse),
      });

      await initTokenList(SupportedChainId.MAINNET);

      expect(mockTokenCacheRepository.initTokenList).toHaveBeenCalledWith(
        SupportedChainId.MAINNET,
        expect.arrayContaining([
          expect.objectContaining({
            chainId: SupportedChainId.MAINNET,
            address: '0xa0b86a33e6441d08b8b3f4b89b0e1e9b1b1c1d1e',
            name: 'Minimal Token',
            symbol: 'MIN',
            decimals: 18,
          }),
        ])
      );
    });
  });
});
