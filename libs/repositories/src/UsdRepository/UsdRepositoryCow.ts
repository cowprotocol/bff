import { injectable } from 'inversify';
import { UsdRepositoryNoop } from './UsdRepository';
import { cowApiClientMainnet } from '../cowApi';
import { OneBigNumber, TenBigNumber, USDC, ZeroBigNumber } from '../const';
import { SupportedChainId } from '../types';
import { BigNumber } from 'bignumber.js';
import { throwIfUnsuccessful } from '../utils/fetch';

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
    const {
      data: priceResult = {},
      response,
      error,
    } = await cowApiClientMainnet.GET('/api/v1/token/{token}/native_price', {
      params: {
        path: {
          token: tokenAddress,
        },
      },
    });

    // If tokens is not found, return null. See See https://api.cow.fi/mainnet/api/v1/token/this-is-not-a-token/native_price
    if (response.status === 404) {
      return null;
    }

    // Unsupported tokens return undefined. See https://api.cow.fi/mainnet/api/v1/token/0x0000000000000000000000000000000000000000/native_price
    if (response.status === 400) {
      const errorType = (error as any)?.errorType;
      const description = (error as any)?.description;
      if (errorType === 'UnsupportedToken') {
        return null;
      } else {
        await throwIfUnsuccessful(
          `Error getting native prices`,
          response,
          errorType && description ? `${errorType}: ${description}` : undefined
        );
      }
    }

    await throwIfUnsuccessful('Error getting native prices', response);

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
  return OneBigNumber.times(TenBigNumber.pow(18 - decimals)).div(value);
}
