import { injectable } from 'inversify';
import { PricePoint, PriceStrategy, UsdRepository } from './UsdRepository';
import { SupportedChainId } from '@cowprotocol/shared';

@injectable()
export class UsdRepositoryFallback implements UsdRepository {
  constructor(private usdRepositories: UsdRepository[]) {}

  async getUsdPrice(
    chainId: SupportedChainId,
    tokenAddress: string
  ): Promise<number | null> {
    for (const usdRepository of this.usdRepositories) {
      const price = await usdRepository.getUsdPrice(chainId, tokenAddress);
      if (price !== null) {
        return price;
      }
    }
    return null;
  }

  async getUsdPrices(
    chainId: SupportedChainId,
    tokenAddress: string,
    priceStrategy: PriceStrategy
  ): Promise<PricePoint[] | null> {
    for (const usdRepository of this.usdRepositories) {
      const prices = await usdRepository.getUsdPrices(
        chainId,
        tokenAddress,
        priceStrategy
      );
      if (prices !== null) {
        return prices;
      }
    }
    return null;
  }
}
