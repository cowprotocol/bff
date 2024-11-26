import { injectable } from 'inversify';
import { parseAbi, PublicClient } from 'viem';

import {
  getQuote,
  TradeParameters,
  SwapAdvancedSettings,
  QuoteResults,
  OrderBookApi,
  SigningScheme,
  CowEnv,
  COW_PROTOCOL_SETTLEMENT_CONTRACT_ADDRESS,
  SupportedChainId
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
const SettlementInterface = GPv2Settlement__factory.createInterface()

@injectable()
export class TradingService {
  constructor(
    private erc20Repository: Erc20Repository,
    private viemClients: Record<SupportedChainId, PublicClient>
  ) {
  }

  async getQuote(
    trader: Parameters<typeof getQuote>[1],
    params: Omit<TradeParameters, 'sellTokenDecimals' | 'buyTokenDecimals'>,
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

  private async getPreSignTransaction(
    chainId: SupportedChainId,
    account: string,
    orderId: string
  ): Promise<PostOrderResult['preSignTransaction']> {
    const viemClient = this.viemClients[chainId]

    const method = 'setPreSignature'

    const settlementContractAddress = COW_PROTOCOL_SETTLEMENT_CONTRACT_ADDRESS[chainId] as `0x${string}`
    const preSignatureCall = SettlementInterface.encodeFunctionData(method, [orderId, true])

    const gas = await (async () => {
      try {
        return viemClient.estimateContractGas({
          address: settlementContractAddress,
          abi: parseAbi([
            SettlementInterface.getFunction(method).format('full')
          ]),
          functionName: method,
          account: account as `0x${string}`,
          args: [orderId, true]
        })
      } catch (e) {
        return DEFAULT_GAS_LIMIT
      }
    })()

    return {
      callData: preSignatureCall,
      gasLimit: this.addGasLimitMargin(gas).toString(),
      to: settlementContractAddress,
      value: '0'
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
}
