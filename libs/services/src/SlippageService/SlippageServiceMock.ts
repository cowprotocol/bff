import { injectable } from 'inversify';
import { Bps, SlippageService } from './SlippageService';

const DEFAULT_SLIPPAGE_BPS = 50;

@injectable()
export class SlippageServiceMock implements SlippageService {
  constructor() {}

  async getSlippageBps(): Promise<Bps> {
    return DEFAULT_SLIPPAGE_BPS;
  }
}
