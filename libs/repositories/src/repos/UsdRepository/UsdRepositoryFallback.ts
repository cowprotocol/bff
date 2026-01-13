import { injectable } from 'inversify';
import { logger } from '@cowprotocol/shared';
import { PricePoint, PriceStrategy, UsdRepository } from './UsdRepository';

@injectable()
export class UsdRepositoryFallback implements UsdRepository {
  constructor(private usdRepositories: UsdRepository[]) {}

  async getUsdPrice(
    chainIdOrSlug: string,
    tokenAddress: string,
  ): Promise<number | null> {
    for (let i = 0; i < this.usdRepositories.length; i++) {
      const usdRepository = this.usdRepositories[i];
      const price = await usdRepository.getUsdPrice(
        chainIdOrSlug,
        tokenAddress,
      );
      if (price !== null) {
        return price;
      }

      if (i < this.usdRepositories.length - 1) {
        const nextRepository = this.usdRepositories[i + 1];
        logger.info(
          `UsdRepositoryFallback: ${usdRepository.constructor.name} returned null, falling back to ${nextRepository.constructor.name}`,
        );
      }
    }
    return null;
  }

  async getUsdPrices(
    chainIdOrSlug: string,
    tokenAddress: string,
    priceStrategy: PriceStrategy,
  ): Promise<PricePoint[] | null> {
    for (let i = 0; i < this.usdRepositories.length; i++) {
      const usdRepository = this.usdRepositories[i];
      const prices = await usdRepository.getUsdPrices(
        chainIdOrSlug,
        tokenAddress,
        priceStrategy,
      );
      if (prices !== null) {
        return prices;
      }

      if (i < this.usdRepositories.length - 1) {
        const nextRepository = this.usdRepositories[i + 1];
        logger.info(
          `UsdRepositoryFallback: ${usdRepository.constructor.name} returned null, falling back to ${nextRepository.constructor.name}`,
        );
      }
    }
    return null;
  }
}
