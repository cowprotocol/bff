import { SupportedChainId } from '../types';
import { UsdRepositoryCow } from './UsdRepositoryCow';
import { cowApiClientMainnet } from '../cowApi';

import { WETH, okResponse } from '../../test/mock';
import { USDC } from '../const';

function getTokenDecimalsMock(tokenAddress: string) {
  return tokenAddress === WETH ? 18 : 6;
}

const NATIVE_PRICE_ENDPOINT = '/api/v1/token/{token}/native_price';
const WETH_NATIVE_PRICE = 1; // See https://api.cow.fi/mainnet/api/v1/token/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/native_price
const USDC_PRICE = 288778763.042292; // USD price: 3,462.8585200136 (calculated 1e12 / 288778763.042292). See https://api.cow.fi/mainnet/api/v1/token/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/native_price

const usdRepositoryCow = new UsdRepositoryCow(getTokenDecimalsMock);

describe('UsdRepositoryCow', () => {
  describe('getUsdPrice', () => {
    it('Returns first repo price when is not null', async () => {
      // Mock native price
      const cowApiGet = jest.spyOn(cowApiClientMainnet, 'GET');
      cowApiGet.mockImplementation(async (url, params) => {
        const token = (params.params.path as any).token || undefined;
        switch (token) {
          case WETH:
            // Return WETH native price
            return okResponse({ price: WETH_NATIVE_PRICE });
          case USDC[SupportedChainId.MAINNET].address:
            // Return USDC native price
            return okResponse({ price: USDC_PRICE });

          default:
            throw new Error('Unexpected token: ' + token);
        }
      });

      let price = await usdRepositoryCow.getUsdPrice(
        SupportedChainId.MAINNET,
        WETH
      );

      // Assert that the implementation did the right calls to the API
      expect(cowApiGet).toHaveBeenCalledTimes(2);
      expect(cowApiGet.mock.calls).toEqual([
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
