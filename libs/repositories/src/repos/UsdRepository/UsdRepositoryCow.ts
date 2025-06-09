import { SupportedChainId } from '@cowprotocol/cow-sdk';
import { logger } from '@cowprotocol/shared';
import { BigNumber } from 'bignumber.js';
import { injectable } from 'inversify';

import { OneBigNumber, TenBigNumber, USDC, ZeroBigNumber } from '../../const';
import { CowApiClient } from '../../datasources/cowApi';
import { throwIfUnsuccessful } from '../../utils/throwIfUnsuccessful';
import { Erc20Repository } from '../Erc20Repository/Erc20Repository';
import { UsdRepositoryNoop } from './UsdRepository';

import { getSupportedCoingeckoChainId } from '../../utils/coingeckoUtils';

@injectable()
export class UsdRepositoryCow extends UsdRepositoryNoop {
  constructor(
    private cowApiClients: Record<SupportedChainId, CowApiClient>,
    private erc20Repository: Erc20Repository
  ) {
    super();
  }

  async getUsdPrice(
    chainIdOrSlug: string,
    tokenAddress?: string | undefined
  ): Promise<number | null> {
    const chainId = getSupportedCoingeckoChainId(chainIdOrSlug);
    if (!chainId) {
      return null;
    }

    if (!tokenAddress) {
      logger.debug({
        msg: `Token address is required for UsdRepositoryCow`,
      });
      return null;
    }

    // Get native price for token (in ETH/xDAI)
    const tokenNativePrice = await this.getNativePrice(chainId, tokenAddress);

    if (!tokenNativePrice) {
      logger.info({
        msg: `Native price not found for ${tokenAddress} on chain ${chainId}`,
      });
      return null;
    }

    const erc20 = await this.erc20Repository.get(chainId, tokenAddress);
    const tokenDecimals = erc20?.decimals;

    if (tokenDecimals === undefined) {
      logger.info({
        msg: `Token decimals not found for ${tokenAddress} on chain ${chainId}`,
      });
      return null;
    }

    // Get native price for USDC (in ETH/xDAI)
    const { address: usdAddress, decimals: usdDecimals } = USDC[chainId];
    const usdcNativePrice = await this.getNativePrice(chainId, usdAddress);

    if (!usdcNativePrice) {
      logger.info({
        msg: `Usd native price not found for ${usdAddress} on chain ${chainId}`,
      });
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
      logger.info({
        msg: `Token price is zero for ${tokenAddress} on chain ${chainId}`,
      });
      return null;
    }

    return usdcPrice.div(tokenPrice).toNumber();
  }

  private async getNativePrice(
    chainId: SupportedChainId,
    tokenAddress: string
  ) {
    const cowApiClient = this.cowApiClients[chainId];
    const {
      data: priceResult = {},
      response,
      error,
    } = await cowApiClient.GET('/api/v1/token/{token}/native_price', {
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
