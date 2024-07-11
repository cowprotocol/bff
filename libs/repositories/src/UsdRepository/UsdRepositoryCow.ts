import 'reflect-metadata';

import { injectable } from 'inversify';
import { UsdRepositoryNoop } from './UsdRepository';
import { cowApiClient } from '../cowApi';
import { OneBigNumber, TenBigNumber, USDC, ZeroBigNumber } from '../const';
import { SupportedChainId } from '../types';
import { BigNumber } from 'bignumber.js';

@injectable()
export class UsdRepositoryCow extends UsdRepositoryNoop {
  constructor(
    private getTokenDecimals: (tokenAddress: string) => number | null
  ) {
    super();
  }

  async getUsdPrice(
    chainId: SupportedChainId,
    tokenAddress: string
  ): Promise<number | null> {
    // Get native price for token (in ETH/xDAI)
    const tokenNativePrice = await this.getNativePrice(chainId, tokenAddress);
    if (!tokenNativePrice) {
      return null;
    }
    const tokenDecimals = this.getTokenDecimals(tokenAddress);

    // Get native price for USDC (in ETH/xDAI)
    const { address: usdAddress, decimals: usdDecimals } = USDC[chainId];
    const usdcNativePrice = await this.getNativePrice(chainId, usdAddress);
    if (!usdcNativePrice) {
      return null;
    }

    const usdcPrice = invertNativeToTokenPrice(
      new BigNumber(usdcNativePrice),
      usdDecimals
    );
    const tokenPrice = invertNativeToTokenPrice(
      new BigNumber(tokenNativePrice),
      tokenDecimals
    );

    if (tokenPrice.eq(ZeroBigNumber)) {
      return null;
    }

    return usdcPrice.div(tokenPrice).toNumber();
  }

  private async getNativePrice(
    _chainId: SupportedChainId,
    tokenAddress: string
  ) {
    // TODO: Support other networks!!!!
    const { data: priceResult } = await cowApiClient.GET(
      '/api/v1/token/{token}/native_price',
      {
        params: {
          path: {
            token: tokenAddress,
          },
        },
      }
    );

    return priceResult.price || null;
  }
}

/**
 * API response value represents the amount of native token atoms needed to buy 1 atom of the specified token
 * This function inverts the price to represent the amount of specified token atoms needed to buy 1 atom of the native token
 */
function invertNativeToTokenPrice(
  value: BigNumber,
  decimals: number
): BigNumber {
  const inverted = OneBigNumber.div(value);
  return inverted.times(TenBigNumber.pow(18 - decimals));
}
