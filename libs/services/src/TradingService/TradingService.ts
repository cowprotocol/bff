import { inject, injectable } from 'inversify';
import {
  getQuote,
  TradeParameters,
  SwapAdvancedSettings,
  QuoteResults,
  OrderBookApi,
  SupportedChainId,
  CowEnv
} from '@cowprotocol/cow-sdk';
import { Erc20Repository, erc20RepositorySymbol } from '@cowprotocol/repositories';

export const tradingServiceSymbol = Symbol.for('TradingServiceSymbol');

interface TraderParams {
  chainId: SupportedChainId
  account: string
  env?: CowEnv
}

@injectable()
export class TradingService {
  constructor(
    @inject(erc20RepositorySymbol)
    private erc20Repository: Erc20Repository
  ) {
  }

  async getQuote(
    trader: Parameters<typeof getQuote>[1],
    params: Omit<TradeParameters, 'sellTokenDecimals' | 'buyTokenDecimals'>,
    advancedSettings?: SwapAdvancedSettings
  ): Promise<QuoteResults> {
    const chainId = trader.chainId as number
    const sellToken = await this.erc20Repository.get(chainId, params.sellToken);
    const buyToken = await this.erc20Repository.get(chainId, params.buyToken);

    if (typeof sellToken?.decimals !== 'number' || typeof buyToken?.decimals !== 'number') {
      throw new Error('[TradingService.getQuote] Cannot find tokens decimals')
    }

    const sellTokenDecimals = sellToken.decimals
    const buyTokenDecimals = buyToken.decimals

    return getQuote({ ...params, sellTokenDecimals, buyTokenDecimals }, trader, advancedSettings)
      .then(({result}) => result);
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
