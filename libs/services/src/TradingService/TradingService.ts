import { injectable } from 'inversify';
import { getQuote, TradeParameters, SwapAdvancedSettings, QuoteResults } from '@cowprotocol/cow-sdk';

export const tradingServiceSymbol = Symbol.for('TradingServiceSymbol');

@injectable()
export class TradingService {

  async getQuote(
    trader: Parameters<typeof getQuote>[1],
    params: TradeParameters,
    advancedSettings?: SwapAdvancedSettings
  ): Promise<QuoteResults> {
    return getQuote(params, trader, advancedSettings).then(({result}) => result);
  }
}
