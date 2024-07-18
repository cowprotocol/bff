import { injectable } from 'inversify';
import { PricePoint, PriceStrategy, UsdRepository } from './UsdRepository';
import { SupportedChainId } from '../types';

@injectable()
export class UsdRepositoryRedis implements UsdRepository {
  constructor(private proxy: UsdRepository) {}

  getUsdPrice(
    chainId: SupportedChainId,
    tokenAddress: string
  ): Promise<number | null> {
    return this.proxy.getUsdPrice(chainId, tokenAddress);
  }
  getUsdPrices(
    chainId: SupportedChainId,
    tokenAddress: string,
    priceStrategy: PriceStrategy
  ): Promise<PricePoint[] | null> {
    return this.proxy.getUsdPrices(chainId, tokenAddress, priceStrategy);
  }
}
