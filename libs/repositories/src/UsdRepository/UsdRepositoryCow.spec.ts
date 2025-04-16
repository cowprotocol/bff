import { SupportedChainId } from '@cowprotocol/shared';
import { UsdRepositoryCow } from './UsdRepositoryCow';

import { Logger } from 'pino';
import { NULL_ADDRESS, WETH, errorResponse, okResponse } from '../../test/mock';
import { USDC } from '../const';
import { CowApiClient } from '../datasources/cowApi';
import { Erc20, Erc20Repository } from '../Erc20Repository/Erc20Repository';

const mockApiGet = jest.fn();

// Mock implementation for PublicClient
const mockApi: CowApiClient = {
  GET: mockApiGet,
  // Add other methods of PublicClient if needed
} as unknown as jest.Mocked<CowApiClient>;

const NATIVE_PRICE_ENDPOINT = '/api/v1/token/{token}/native_price';
const WETH_NATIVE_PRICE = 1; // See https://api.cow.fi/mainnet/api/v1/token/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/native_price
const USDC_PRICE = 288778763.042292; // USD price: 3,462.8585200136 (calculated 1e12 / 288778763.042292). See https://api.cow.fi/mainnet/api/v1/token/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/native_price

const mockErc20Repository = {
  async get(
    chainId: SupportedChainId,
    tokenAddress: string
  ): Promise<Erc20 | null> {
    const decimals = tokenAddress === WETH ? 18 : 6;
    return {
      address: tokenAddress,
      decimals,
    };
  },
} as jest.Mocked<Erc20Repository>;

// const mockLogger = jest.fn() as unknown as jest.Mocked<Logger>;
const mockLogger = jest.mocked<Logger>({
  info: jest.fn(),
} as unknown as Logger);

const cowApiClients = {
  [SupportedChainId.MAINNET]: mockApi,
  [SupportedChainId.GNOSIS_CHAIN]: mockApi,
  [SupportedChainId.ARBITRUM_ONE]: mockApi,
  [SupportedChainId.BASE]: mockApi,
  [SupportedChainId.SEPOLIA]: mockApi,
};

const usdRepositoryCow = new UsdRepositoryCow(
  cowApiClients,
  mockErc20Repository,
  mockLogger
);

// const cowApiMock = jest.spyOn(cowApiClientMainnet, 'GET');

describe('UsdRepositoryCow', () => {
  describe('getUsdPrice', () => {
    it('USD price calculation is correct', async () => {
      // Mock native price
      mockApiGet.mockImplementation(async (url, params) => {
        const token = (params as any).params.path.token || undefined;
        switch (token) {
          case WETH:
            // Return WETH native price
            return okResponse({
              data: { price: WETH_NATIVE_PRICE },
            });
          case USDC[SupportedChainId.MAINNET].address:
            // Return USDC native price
            return okResponse({
              data: { price: USDC_PRICE },
            });

          default:
            throw new Error('Unexpected token: ' + token);
        }
      });

      // Get USD price for WETH
      const price = await usdRepositoryCow.getUsdPrice(
        SupportedChainId.MAINNET,
        WETH
      );

      // Assert that the implementation did the right calls to the API
      expect(mockApiGet).toHaveBeenCalledTimes(2);
      expect(mockApiGet.mock.calls).toEqual([
        [NATIVE_PRICE_ENDPOINT, { params: { path: { token: WETH } } }],
        [
          NATIVE_PRICE_ENDPOINT,
          {
            params: { path: { token: USDC[SupportedChainId.MAINNET].address } },
          },
        ],
      ]);

      // USD calculation based on native price is correct
      expect(price).toEqual(3_462.8585200136367);
    });
    it('Handles UnsupportedToken(400) errors', async () => {
      // Mock native price
      mockApiGet.mockReturnValue(
        errorResponse({
          status: 400,
          statusText: 'Bad Request',
          error: {
            errorType: 'UnsupportedToken',
            description: 'Token not supported',
          },
        })
      );

      // Get USD price for a not supported token
      const price = await usdRepositoryCow.getUsdPrice(
        SupportedChainId.MAINNET,
        NULL_ADDRESS // See https://api.cow.fi/mainnet/api/v1/token/0x0000000000000000000000000000000000000000/native_price
      );

      // USD calculation based on native price is correct
      expect(price).toEqual(null);
    });

    it('Handles NewErrorTypeWeDontHandleYet(400) errors', async () => {
      // Mock native price
      mockApiGet.mockReturnValue(
        errorResponse({
          status: 400,
          statusText: 'Bad Request',
          error: {
            errorType: 'NewErrorTypeWeDontHandleYet',
            description:
              "This is a new error type we don't, so we expect the repository to throw",
          },
        })
      );

      // Get USD price for a not supported token
      const pricePromise = usdRepositoryCow.getUsdPrice(
        SupportedChainId.MAINNET,
        WETH
      );

      // USD calculation based on native price is correct
      expect(pricePromise).rejects.toThrow(
        "Error getting native prices. 400 (Bad Request): Mock response text. NewErrorTypeWeDontHandleYet: This is a new error type we don't, so we expect the repository to throw URL: http://mocked-url.mock"
      );
    });

    it('Handles NotFound(404) errors', async () => {
      // Mock native price
      mockApiGet.mockReturnValue(
        errorResponse({
          status: 404,
          statusText: 'Not Found',
          error: undefined,
        })
      );

      // Get USD price for something is not even an address
      const price = await usdRepositoryCow.getUsdPrice(
        SupportedChainId.MAINNET,
        'this-is-not-a-token' // See https://api.cow.fi/mainnet/api/v1/token/this-is-not-a-token/native_price
      );

      // USD calculation based on native price is correct
      expect(price).toEqual(null);
    });

    it('Handles un-expected errors (I_AM_A_TEA_POT)', async () => {
      // Mock native price
      mockApiGet.mockReturnValue(
        errorResponse({
          status: 418,
          statusText: "I'm a teapot",
          url: 'http://calling-a-teapot.com',
          text: async () =>
            'This server is a teapot, and it cannot brew coffee',
          error: undefined,
        })
      );

      // Get USD price for something is not even an address
      const priceResult = usdRepositoryCow.getUsdPrice(
        SupportedChainId.MAINNET,
        'this-is-not-a-token'
      );

      // USD calculation based on native price is correct
      expect(priceResult).rejects.toThrow(
        "Error getting native prices. 418 (I'm a teapot): This server is a teapot, and it cannot brew coffee. URL: http://calling-a-teapot.com"
      );
    });

    it('Handles not finding token decimals', async () => {
      // Mock native price
      mockApiGet.mockReturnValue(
        okResponse({
          data: { price: WETH_NATIVE_PRICE },
        })
      );

      const mockErc20Repository = {
        async get(
          chainId: SupportedChainId,
          tokenAddress: string
        ): Promise<Erc20 | null> {
          const decimals = undefined; // Simulate not finding the token decimals
          return {
            address: tokenAddress,
            decimals,
          };
        },
      } as jest.Mocked<Erc20Repository>;

      const usdRepositoryCow = new UsdRepositoryCow(
        cowApiClients,
        mockErc20Repository,
        mockLogger
      );

      // Get USD price for a token without decimals
      const price = await usdRepositoryCow.getUsdPrice(
        SupportedChainId.MAINNET,
        WETH
      );

      // Should return null when missing decimals
      expect(price).toBe(null);
    });
  });

  describe('getUsdPrices', () => {
    it('Returns null', async () => {
      const price = await usdRepositoryCow.getUsdPrices(
        SupportedChainId.MAINNET,
        WETH,
        '5m'
      );
      expect(price).toEqual(null);
    });
  });
});
