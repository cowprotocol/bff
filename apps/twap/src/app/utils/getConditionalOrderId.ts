import { SupportedChainId } from '@cowprotocol/cow-sdk';
import { CurrencyAmount, Token } from '@uniswap/sdk-core';
import { defaultAbiCoder } from '@ethersproject/abi';
import { keccak256 } from '@ethersproject/keccak256';
import { OrderStruct } from '../types/order';

interface ConditionalOrderParams {
  staticInput: string;
  salt: string;
  handler: string;
}

export interface TWAPOrder {
  sellAmount: CurrencyAmount<Token>;
  buyAmount: CurrencyAmount<Token>;
  receiver: string;
  numOfParts: number;
  startTime: number;
  timeInterval: number;
  span: number;
  appData: string;
}

export const TWAP_ORDER_STRUCT =
  'tuple(address sellToken,address buyToken,address receiver,uint256 partSellAmount,uint256 minPartLimit,uint256 t0,uint256 n,uint256 t,uint256 span,bytes32 appData)';

const twapHandlerAddress = '0x910d00a310f7Dc5B29FE73458F47f519be547D3d';
export const TWAP_HANDLER_ADDRESS: Record<SupportedChainId, string> = {
  1: twapHandlerAddress,
  100: twapHandlerAddress,
  5: twapHandlerAddress,
};

export function twapOrderToStruct(order: TWAPOrder): OrderStruct {
  return {
    sellToken: order.sellAmount.currency.address,
    buyToken: order.buyAmount.currency.address,
    receiver: order.receiver,
    partSellAmount: order.sellAmount
      .divide(order.numOfParts)
      .quotient.toString(),
    minPartLimit: order.buyAmount.divide(order.numOfParts).quotient.toString(),
    t0: order.startTime,
    n: order.numOfParts,
    t: order.timeInterval,
    span: order.span,
    appData: order.appData,
  };
}

export function buildTwapOrderParamsStruct(
  chainId: SupportedChainId,
  twapOrderData: OrderStruct
): ConditionalOrderParams {
  return {
    handler: TWAP_HANDLER_ADDRESS[chainId],
    salt: '0x00000000000000000000000000000000000000000000000000000018920d8ce7',
    staticInput: defaultAbiCoder.encode([TWAP_ORDER_STRUCT], [twapOrderData]),
  };
}

const CONDITIONAL_ORDER_PARAMS_STRUCT =
  'tuple(address handler, bytes32 salt, bytes staticInput)';

export function getConditionalOrderId(params: ConditionalOrderParams): string {
  return keccak256(
    defaultAbiCoder.encode([CONDITIONAL_ORDER_PARAMS_STRUCT], [params])
  );
}
