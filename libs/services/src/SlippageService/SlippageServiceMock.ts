import { injectable } from 'inversify';
import {
  Bps,
  OrderForSlippageCalculation,
  SlippageService,
  VolatilityDetails,
} from './SlippageService';
import { SupportedChainId } from '@cowprotocol/repositories';

const DEFAULT_SLIPPAGE_BPS = 50;

@injectable()
export class SlippageServiceMock implements SlippageService {
  constructor() {}
  async getVolatilityDetails(): Promise<VolatilityDetails | null> {
    return null;
  }

  async getSlippageBps(): Promise<Bps> {
    return DEFAULT_SLIPPAGE_BPS;
  }
}
