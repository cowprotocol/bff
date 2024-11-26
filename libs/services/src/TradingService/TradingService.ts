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
  COW_PROTOCOL_SETTLEMENT_CONTRACT_ADDRESS,
  SupportedChainId,
  getEthFlowTransaction,
  swapParamsToLimitOrderParams
} from '@cowprotocol/cow-sdk';
import { Erc20Repository } from '@cowprotocol/repositories';
import { ETHEREUM_ADDRESS_LENGTH, NativeCurrencyAddress, NativeCurrencyDecimals } from '@cowprotocol/shared';
import { GPv2Settlement__factory } from '@cowprotocol/abis';

export const tradingServiceSymbol = Symbol.for('TradingServiceSymbol');

interface TraderParams {
  chainId: number // TODO use SupportedChainId when the hell with local copy of SupportedChainId is solved
  account: string
  env?: CowEnv
}

export interface PostOrderResult {
  orderId: string
  preSignTransaction?: {
    callData: string
    gasLimit: string
    to: string
    value: '0'
  }
}

const GAS_LIMIT_MARGIN = 20 // 20%
const DEFAULT_GAS_LIMIT = BigInt(150000)

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
    quoteResponse: QuoteResults['quoteResponse'],
    orderTypedData: QuoteResults['orderTypedData'],
    appDataInfo: QuoteResults['appDataInfo'],
    signature: string
  ): Promise<PostOrderResult> {
    if (!quoteResponse.id) {
      throw new Error('Quote id is required to post order')
    }

    if (!quoteResponse.quote.signingScheme) {
      throw new Error('Quote signing scheme is required to post order')
    }

    const { chainId, account, env } = trader

    const orderBookApi = new OrderBookApi({ chainId, env })
    const isPreSign = signature.length === ETHEREUM_ADDRESS_LENGTH

    const signingScheme = isPreSign
        ? SigningScheme.PRESIGN
        : quoteResponse.quote.signingScheme

    const orderId = await orderBookApi.sendOrder({
      ...orderTypedData.message,
      from: account.toLowerCase(),
      signature,
      signingScheme,
      quoteId: quoteResponse.id,
      appData: appDataInfo.fullAppData,
      appDataHash: appDataInfo.appDataKeccak256
    })

    if (isPreSign) {
      return {
        orderId,
        preSignTransaction: await this.getPreSignTransaction(chainId, trader.account, orderId)
      }
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
    const viemClient = this.viemClients[trader.chainId as SupportedChainId] as Client<Transport, Chain>
    const provider = this.viemClientToEthersProvider(viemClient)

    return getEthFlowTransaction(
      provider.getSigner(trader.account),
      appDataInfo.appDataKeccak256,
      swapParamsToLimitOrderParams(params, quoteId, amountsAndCosts),
    )
  }

  private async getPreSignTransaction(
    chainId: SupportedChainId,
    account: string,
    orderId: string
  ): Promise<PostOrderResult['preSignTransaction']> {
    const viemClient = this.viemClients[chainId] as Client<Transport, Chain>
    const provider = this.viemClientToEthersProvider(viemClient)
    const contract = GPv2Settlement__factory.connect(account, provider)

    const settlementContractAddress = COW_PROTOCOL_SETTLEMENT_CONTRACT_ADDRESS[chainId] as `0x${string}`
    const preSignatureCall = contract.interface.encodeFunctionData('setPreSignature', [orderId, true])

    const gas = await contract.estimateGas.setPreSignature(orderId, true)
      .then((res) => BigInt(res.toHexString()))
      .catch((error) => {
        console.error(error)

        return DEFAULT_GAS_LIMIT
      })

    return {
      callData: preSignatureCall,
      gasLimit: '0x' + this.addGasLimitMargin(gas).toString(16),
      to: settlementContractAddress,
      value: '0'
    }
  }

  private async getTokenDecimals(chainId: number, tokenAddress: string): Promise<number> {
    if (tokenAddress.toLowerCase() === NativeCurrencyAddress.toLowerCase()) {
      return NativeCurrencyDecimals
    } else {
      const token = await this.erc20Repository.get(chainId, tokenAddress)

      if (typeof token?.decimals !== 'number') {
        throw new Error('[TradingService.getQuote] Cannot find tokens decimals, token: ' + tokenAddress)
      }

      return token.decimals
    }
  }

  /**
   * Returns the gas value plus a margin for unexpected or variable gas costs
   * @param value the gas value to pad
   */
  private addGasLimitMargin(value: bigint): bigint {
    const twentyPercent = value * BigInt(GAS_LIMIT_MARGIN) / BigInt(100);
    return value + twentyPercent;
  }

  private viemClientToEthersProvider(client: Client<Transport, Chain>): Web3Provider {
    const { chain, transport } = client
    const network = {
      chainId: chain.id,
      name: chain.name,
      ensAddress: chain.contracts?.ensRegistry?.address,
    }

    return new Web3Provider(transport, network)
  }
}
