import { injectable } from 'inversify';
import { Bps, PairVolatility, SlippageService, VolatilityDetails } from './SlippageService';

const DEFAULT_SLIPPAGE_BPS = 50;

@injectable()
export class SlippageServiceMock implements SlippageService {
  async getVolatilityDetails(): Promise<VolatilityDetails | null> {
    return null;
  }

  async getSlippageBps(): Promise<Bps> {
    return DEFAULT_SLIPPAGE_BPS;
  }

  async getVolatilityForPair(): Promise<PairVolatility | null> {
    return null;
  }
}
