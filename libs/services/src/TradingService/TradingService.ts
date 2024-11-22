import { injectable } from 'inversify';
import {
  getQuote,
  TradeParameters,
  SwapAdvancedSettings,
  QuoteResults,
  OrderBookApi,
  SupportedChainId,
  CowEnv
} from '@cowprotocol/cow-sdk';

export const tradingServiceSymbol = Symbol.for('TradingServiceSymbol');

interface TraderParams {
  chainId: SupportedChainId
  account: string
  env?: CowEnv
}

@injectable()
export class TradingService {

  async getQuote(
    trader: Parameters<typeof getQuote>[1],
    params: TradeParameters,
    advancedSettings?: SwapAdvancedSettings
  ): Promise<QuoteResults> {
    return getQuote(params, trader, advancedSettings).then(({result}) => result);
  }

  async postOrder(
    trader: TraderParams,
    quoteResponse: QuoteResults['quoteResponse'],
    orderTypedData: QuoteResults['orderTypedData'],
    appDataInfo: QuoteResults['appDataInfo'],
    signature: string
  ) {
    if (!quoteResponse.id) {
      throw new Error('Quote id is required to post order')
    }

    if (!quoteResponse.quote.signingScheme) {
      throw new Error('Quote signing scheme is required to post order')
    }

    const {chainId, account, env} = trader

    const orderBookApi = new OrderBookApi({ chainId, env })

    return orderBookApi.sendOrder({
      ...orderTypedData.message,
      from: account.toLowerCase(),
      signature,
      signingScheme: quoteResponse.quote.signingScheme,
      quoteId: quoteResponse.id,
      appData: appDataInfo.fullAppData,
      appDataHash: appDataInfo.appDataKeccak256
    })
  }
}
