import { injectable } from 'inversify';
import { Chain, Client, PublicClient, Transport } from 'viem';
import { Web3Provider } from '@ethersproject/providers'

import {
  getQuote,
  SwapAdvancedSettings,
  QuoteResults,
  OrderBookApi,
  SigningScheme,
  CowEnv,
  SupportedChainId,
  getEthFlowTransaction,
  swapParamsToLimitOrderParams,
  getPreSignTransaction
} from '@cowprotocol/cow-sdk';
import { Erc20Repository } from '@cowprotocol/repositories';
import { NativeCurrencyAddress, NativeCurrencyDecimals } from '@cowprotocol/shared';

export const tradingServiceSymbol = Symbol.for('TradingServiceSymbol');

interface TraderParams {
  chainId: number // TODO use SupportedChainId when the hell with local copy of SupportedChainId is solved
  account: string
  env?: CowEnv
}

export interface PostOrderResult {
  orderId: string
  preSignTransaction?: {
    data: string
    gas: string
    to: string
    value: '0'
  }
}

@injectable()
export class TradingService {
  constructor(
    private erc20Repository: Erc20Repository,
    private viemClients: Record<SupportedChainId, PublicClient>
  ) {
  }

  async getQuote(
    trader: Parameters<typeof getQuote>[1],
    params: Omit<QuoteResults['tradeParameters'], 'sellTokenDecimals' | 'buyTokenDecimals'>,
    advancedSettings?: SwapAdvancedSettings
  ): Promise<QuoteResults> {
    const chainId = trader.chainId as number

    const sellTokenDecimals = await this.getTokenDecimals(chainId, params.sellToken)
    const buyTokenDecimals = await this.getTokenDecimals(chainId, params.buyToken)

    return getQuote({ ...params, sellTokenDecimals, buyTokenDecimals }, trader, advancedSettings)
      .then(({result}) => result);
  }

  async postOrder(
    trader: TraderParams,
    quoteId: number,
    orderToSign: QuoteResults['orderToSign'],
    appDataInfo: QuoteResults['appDataInfo'],
    signingScheme: SigningScheme = SigningScheme.EIP712,
    _signature?: string
  ): Promise<PostOrderResult> {
    const { chainId, account, env } = trader

    const orderBookApi = new OrderBookApi({ chainId, env })
    const signature = _signature || account
    const isPreSign = signingScheme === SigningScheme.PRESIGN

    const orderId = await orderBookApi.sendOrder({
      ...orderToSign,
      quoteId,
      from: account.toLowerCase(),
      signature,
      signingScheme,
      appData: appDataInfo.fullAppData,
      appDataHash: appDataInfo.appDataKeccak256
    })

    if (isPreSign) {
      return this.getPostOrderResultWithPreSignTx(chainId, account, orderId)
    } else {
      return { orderId }
    }
  }

  async getEthFlowTransaction(
    trader: TraderParams,
    quoteId: number,
    params: QuoteResults['tradeParameters'],
    amountsAndCosts: QuoteResults['amountsAndCosts'],
    appDataInfo: QuoteResults['appDataInfo'],
  ): Promise<ReturnType<typeof getEthFlowTransaction>> {
    const provider = this.viemClientToEthersProvider(trader.chainId)

    return getEthFlowTransaction(
      provider.getSigner(trader.account),
      appDataInfo.appDataKeccak256,
      swapParamsToLimitOrderParams(params, quoteId, amountsAndCosts),
    )
  }

  async getPostOrderResultWithPreSignTx(chainId: number, account: string, orderId: string): Promise<PostOrderResult> {
    const provider = this.viemClientToEthersProvider(chainId)
    const signer = provider.getSigner(account)
    const preSignTransaction = await getPreSignTransaction(signer, chainId, account, orderId)

    return {
      orderId,
      preSignTransaction: {
        ...preSignTransaction,
        // Just to satisfy typescript. This value is always 0 in preSignTransaction as well
        value: '0'
      }
    }
  }

  private async getTokenDecimals(chainId: number, tokenAddress: string): Promise<number> {
    if (tokenAddress.toLowerCase() === NativeCurrencyAddress.toLowerCase()) {
      return NativeCurrencyDecimals[chainId as keyof typeof NativeCurrencyDecimals]
    } else {
      const token = await this.erc20Repository.get(chainId, tokenAddress)

      if (typeof token?.decimals !== 'number') {
        throw new Error('[TradingService.getQuote] Cannot find tokens decimals, token: ' + tokenAddress)
      }

      return token.decimals
    }
  }

  private viemClientToEthersProvider(chainId: number): Web3Provider {
    const client = this.viemClients[chainId as SupportedChainId] as Client<Transport, Chain>

    const { chain, transport } = client
    const network = {
      chainId: chain.id,
      name: chain.name,
      ensAddress: chain.contracts?.ensRegistry?.address,
    }

    return new Web3Provider(transport, network)
  }
}
