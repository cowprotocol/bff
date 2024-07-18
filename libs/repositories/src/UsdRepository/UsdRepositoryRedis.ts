import { injectable } from 'inversify';
import {
  PricePoint,
  PriceStrategy,
  UsdRepository,
  UsdRepositoryNoop,
} from './UsdRepository';
import { cowApiClientMainnet } from '../cowApi';
import { OneBigNumber, TenBigNumber, USDC, ZeroBigNumber } from '../const';
import { SupportedChainId } from '../types';
import { BigNumber } from 'bignumber.js';
import { throwIfUnsuccessful } from '../utils/throwIfUnsuccessful';

@injectable()
export class UsdRepositoryRedis implements UsdRepository {
  getUsdPrice(
    chainId: SupportedChainId,
    tokenAddress: string
  ): Promise<number | null> {
    throw new Error('Method not implemented.');
  }
  getUsdPrices(
    chainId: SupportedChainId,
    tokenAddress: string,
    priceStrategy: PriceStrategy
  ): Promise<PricePoint[] | null> {
    throw new Error('Method not implemented.');
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
