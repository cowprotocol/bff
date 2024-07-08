import { UsdRepository, usdRepositorySymbol } from '@cowprotocol/repositories';
import { injectable, inject } from 'inversify';

/**
 * BPS (Basis Points)
 */
export type Bps = number;

export interface SlippageService {
  getSlippageBps(
    quoteTokenAddress: string,
    baseTokenAddress: string
  ): Promise<Bps>;
}

export const slippageServiceSymbol = Symbol.for('SlippageService');

@injectable()
export class SlippageServiceImpl implements SlippageService {
  @inject(usdRepositorySymbol)
  private usdRepository: UsdRepository;

  async getSlippageBps(
    quoteTokenAddress: string,
    baseTokenAddress: string
  ): Promise<Bps> {
    const [slippageQuoteToken, slippageBaseToken] = await Promise.all([
      this.getSlippageForToken(quoteTokenAddress),
      this.getSlippageForToken(quoteTokenAddress),
    ]);

    return Math.max(slippageQuoteToken, slippageBaseToken);
  }

  private async getSlippageForToken(tokenAddress: string) {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    const todayPrice = await this.usdRepository.getDailyUsdPrice(
      tokenAddress,
      today
    );
    const yesterdayPrice = await this.usdRepository.getDailyUsdPrice(
      tokenAddress,
      yesterday
    );
    const bps = Math.abs(
      ((todayPrice - yesterdayPrice) / yesterdayPrice) * 10000
    );

    return Math.ceil(bps);
  }
}
