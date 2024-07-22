import {
  UsdRepository,
  usdRepositorySymbol,
  SupportedChainId,
} from '@cowprotocol/repositories';
import { injectable, inject } from 'inversify';
import { Bps, SlippageService } from './SlippageService';

const DEFAULT_SLIPPAGE_BPS = 200;

@injectable()
export class SlippageServiceMain implements SlippageService {
  constructor(
    @inject(usdRepositorySymbol)
    private usdRepository: UsdRepository
  ) {}

  async getSlippageBps(
    quoteTokenAddress: string,
    baseTokenAddress: string
  ): Promise<Bps> {
    const [slippageQuoteToken, slippageBaseToken] = await Promise.all([
      this.getSlippageForToken(quoteTokenAddress),
      this.getSlippageForToken(baseTokenAddress),
    ]);

    return Math.max(slippageQuoteToken, slippageBaseToken);
  }

  private async getSlippageForToken(tokenAddress: string): Promise<number> {
    const prices = await this.usdRepository.getUsdPrices(
      SupportedChainId.MAINNET,
      tokenAddress,
      'daily'
    );

    if (!prices) {
      return DEFAULT_SLIPPAGE_BPS;
    }

    const todayPrice = prices[prices.length - 1].price;
    const yesterdayPrice = prices[prices.length - 2].price;
    const bps = Math.abs(
      ((todayPrice - yesterdayPrice) / yesterdayPrice) * 10000
    );

    return Math.ceil(bps);
  }
}
