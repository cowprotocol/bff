import { SupportedChainId } from '../types';
import { UsdRepositoryCow } from './UsdRepositoryCow';
import { cowApiClientMainnet } from '../cowApi';

import { WETH, okResponse } from '../../test/mock';

import assert from 'assert';
import { USDC } from '../const';

function getTokenDecimalsMock(tokenAddress: string) {
  return tokenAddress === WETH ? 18 : 6;
}

const NATIVE_PRICE_ENDPOINT = '/api/v1/token/{token}/native_price';
const WETH_NATIVE_PRICE = 289801403.348473; // 289801403.348473;  3,450.6389149453
const USDC_PRICE = 1;

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

      console.log('cowApiClientMainnet', cowApiClientMainnet);
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
      expect(price).toEqual(3_450.6389149453);
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
