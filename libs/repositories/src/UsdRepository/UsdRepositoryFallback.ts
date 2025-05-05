import { injectable } from 'inversify';
import { PricePoint, PriceStrategy, UsdRepository } from './UsdRepository';

@injectable()
export class UsdRepositoryFallback implements UsdRepository {
  constructor(private usdRepositories: UsdRepository[]) {}

  async getUsdPrice(
    chainIdOrSlug: string,
    tokenAddress: string
  ): Promise<number | null> {
    for (const usdRepository of this.usdRepositories) {
      const price = await usdRepository.getUsdPrice(
        chainIdOrSlug,
        tokenAddress
      );
      if (price !== null) {
        return price;
      }
    }
    return null;
  }

  async getUsdPrices(
    chainIdOrSlug: string,
    tokenAddress: string,
    priceStrategy: PriceStrategy
  ): Promise<PricePoint[] | null> {
    for (const usdRepository of this.usdRepositories) {
      const prices = await usdRepository.getUsdPrices(
        chainIdOrSlug,
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
