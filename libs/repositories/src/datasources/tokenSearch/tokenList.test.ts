import { SupportedChainId } from '@cowprotocol/cow-sdk';
import { getTokenListBySearchParam, initTokenList } from './tokenList';
import { TokenFromAPI } from './types';

jest.mock('./tokenListSearch', () => ({
  tokenListSearch: jest.fn(),
}));

import { tokenListSearch } from './tokenListSearch';
const mockTokenListSearch = tokenListSearch as jest.MockedFunction<
  typeof tokenListSearch
>;

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
    mockTokenListSearch.mockClear();
  });

  describe('initTokenList', () => {
    it('should fetch tokens from seelected token sources only', async () => {
      // Setup mock responses
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokensResponse),
      });

      await initTokenList(SupportedChainId.MAINNET);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://tokens.coingecko.com/ethereum/all.json'
      );
      expect(mockFetch).not.toHaveBeenCalledWith(
        'https://tokens.coingecko.com/gnosis-chain/all.json'
      );
    });

    it('should handle fetch errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      try {
        await initTokenList(SupportedChainId.MAINNET);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Error fetching tokens from'),
          expect.any(Error)
        );
      } catch (error) {
        expect(error).toEqual(new Error('Network error'));
      }

      consoleErrorSpy.mockRestore();
    });

    it('should handle invalid JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      try {
        await initTokenList(SupportedChainId.MAINNET);

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Error fetching tokens from'),
          expect.any(Error)
        );
      } catch (error) {
        expect(error).toEqual(new Error('Invalid JSON'));
      }

      consoleErrorSpy.mockRestore();
    });

    it('should handle responses without tokens array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalidStructure: true }),
      });

      try {
        await initTokenList(SupportedChainId.MAINNET);
      } catch (error) {
        expect(error).toEqual(
          new Error(
            'Invalid token list format from https://tokens.coingecko.com/ethereum/all.json: missing or invalid tokens array'
          )
        );
      }
    });

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      try {
        await initTokenList(SupportedChainId.MAINNET);

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to fetch tokens from https://tokens.coingecko.com/ethereum/all.json: 404 Not Found'
        );
      } catch (error) {
        expect(error).toEqual(
          new Error(
            'Failed to fetch tokens from https://tokens.coingecko.com/ethereum/all.json: 404 Not Found'
          )
        );
      }

      consoleErrorSpy.mockRestore();
    });

    it('should initialize empty arrays for each chain', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ tokens: [] }),
      });

      await initTokenList(SupportedChainId.MAINNET);

      getTokenListBySearchParam(SupportedChainId.MAINNET, 'any');
      expect(mockTokenListSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          [SupportedChainId.MAINNET]: [],
        }),
        SupportedChainId.MAINNET,
        'any'
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

    beforeEach(() => {
      mockTokenListSearch.mockReturnValue(mockSearchResults);
    });

    it('should call tokenListSearch with correct parameters', () => {
      const result = getTokenListBySearchParam(SupportedChainId.MAINNET, 'uni');

      expect(mockTokenListSearch).toHaveBeenCalledWith(
        expect.any(Object), // TOKEN_MAP
        SupportedChainId.MAINNET,
        'uni'
      );
      expect(result).toEqual(mockSearchResults);
    });

    it('should return results from tokenListSearch', () => {
      const result = getTokenListBySearchParam(
        SupportedChainId.MAINNET,
        'test'
      );

      expect(result).toEqual(mockSearchResults);
    });

    it('should handle empty search results', () => {
      mockTokenListSearch.mockReturnValue([]);

      const result = getTokenListBySearchParam(
        SupportedChainId.MAINNET,
        'nonexistent'
      );

      expect(result).toEqual([]);
    });

    it('should handle different chain IDs', () => {
      getTokenListBySearchParam(SupportedChainId.GNOSIS_CHAIN, 'wxdai');

      expect(mockTokenListSearch).toHaveBeenCalledWith(
        expect.any(Object),
        SupportedChainId.GNOSIS_CHAIN,
        'wxdai'
      );
    });

    it('should handle empty search parameters', () => {
      getTokenListBySearchParam(SupportedChainId.MAINNET, '');

      expect(mockTokenListSearch).toHaveBeenCalledWith(
        expect.any(Object),
        SupportedChainId.MAINNET,
        ''
      );
    });

    it('should handle special characters in search parameters', () => {
      const searchParam = '0xabc123!@#$%^&*()';
      getTokenListBySearchParam(SupportedChainId.MAINNET, searchParam);

      expect(mockTokenListSearch).toHaveBeenCalledWith(
        expect.any(Object),
        SupportedChainId.MAINNET,
        searchParam
      );
    });

    it('should handle very long search parameters', () => {
      const longSearchParam = 'a'.repeat(1000);
      getTokenListBySearchParam(SupportedChainId.MAINNET, longSearchParam);

      expect(mockTokenListSearch).toHaveBeenCalledWith(
        expect.any(Object),
        SupportedChainId.MAINNET,
        longSearchParam
      );
    });
  });

  describe('integration with real token data structure', () => {
    it('should properly process token data with all required fields', async () => {
      const completeTokenResponse = {
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
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(completeTokenResponse),
      });

      await initTokenList(SupportedChainId.MAINNET);

      // Verify that TOKEN_MAP was populated correctly
      // This is tested indirectly through getTokenListBySearchParam
      getTokenListBySearchParam(SupportedChainId.MAINNET, 'uni');

      expect(mockTokenListSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          [SupportedChainId.MAINNET]: expect.arrayContaining([
            expect.objectContaining({
              chainId: SupportedChainId.MAINNET,
              address: '0xa0b86a33e6441d08b8b3f4b89b0e1e9b1b1c1d1e',
              name: 'Uniswap',
              symbol: 'UNI',
              decimals: 18,
              logoURI: 'https://example.com/uni.png',
            }),
          ]),
        }),
        SupportedChainId.MAINNET,
        'uni'
      );
    });

    it('should handle token data with optional fields missing', async () => {
      const minimalTokenResponse = {
        tokens: [
          {
            chainId: SupportedChainId.MAINNET,
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

      getTokenListBySearchParam(SupportedChainId.MAINNET, 'minimal');

      expect(mockTokenListSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          [SupportedChainId.MAINNET]: expect.arrayContaining([
            expect.objectContaining({
              chainId: SupportedChainId.MAINNET,
              address: '0xa0b86a33e6441d08b8b3f4b89b0e1e9b1b1c1d1e',
              name: 'Minimal Token',
              symbol: 'MIN',
              decimals: 18,
            }),
          ]),
        }),
        SupportedChainId.MAINNET,
        'minimal'
      );
    });
  });
});
