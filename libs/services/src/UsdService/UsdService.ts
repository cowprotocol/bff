import { UsdRepository, usdRepositorySymbol } from '@cowprotocol/repositories';
import { inject, injectable } from 'inversify';

export interface UsdService {
  getUsdPrice(
    chainIdOrSlug: string,
    tokenAddress?: string | undefined
  ): Promise<number | null>;
}

export const usdServiceSymbol = Symbol.for('UsdService');

@injectable()
export class UsdServiceMain implements UsdService {
  constructor(
    @inject(usdRepositorySymbol)
    private usdRepository: UsdRepository
  ) {}

  async getUsdPrice(
    chainIdOrSlug: string,
    tokenAddress?: string | undefined
  ): Promise<number | null> {
    return this.usdRepository.getUsdPrice(chainIdOrSlug, tokenAddress);
  }
}
