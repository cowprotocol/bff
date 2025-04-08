import {
  UsdRepository,
  usdRepositorySymbol,
  SupportedChainId, PriceStrategy, PricePoint
} from '@cowprotocol/repositories';
import { injectable, inject } from 'inversify';

export interface UsdService {
  getUsdPrice(
    chainId: SupportedChainId,
    tokenAddress: string
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
    chainId: SupportedChainId,
    tokenAddress: string
  ): Promise<number | null> {
    return this.usdRepository.getUsdPrice(chainId, tokenAddress);
  }

  async get24hUsdPrice(
    chainId: SupportedChainId,
    tokenAddress: string,
  ): Promise<PricePoint[] | null> {
    return this.usdRepository.getUsdPrices(chainId, tokenAddress, '5m')
  }
}
