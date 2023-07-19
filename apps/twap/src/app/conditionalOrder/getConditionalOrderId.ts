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

/**
 * Returns the conditional order params struct for a TWAP order.
 *
 * @param chainId Chain ID of the order. Must be a SupportedChainId.
 * @param twapOrderData OrderStruct instance of the order.
 * @returns ConditionalOrderParams instance of the order.
 */
export function buildTwapOrderParamsStruct(
  chainId: SupportedChainId,
  twapOrderData: OrderStruct
): ConditionalOrderParams {
  return {
    handler: TWAP_HANDLER_ADDRESS[chainId],
    // This salt must match between FE and BE to produce the same id, so we need to sync it.
    // If we use time here, because time on server vs local differ, we end up with mismatching ids.
    salt: '0x00000000000000000000000000000000000000000000000000000018920d8ce7',
    staticInput: defaultAbiCoder.encode([TWAP_ORDER_STRUCT], [twapOrderData]),
  };
}

const CONDITIONAL_ORDER_PARAMS_STRUCT =
  'tuple(address handler, bytes32 salt, bytes staticInput)';

/**
 * Generates the conditional order id from the params.
 *
 * @param params ConditionalOrderParams for the order.
 * @returns Deterministically generated conditional order id.
 */
export function getConditionalOrderId(params: ConditionalOrderParams): string {
  return keccak256(
    defaultAbiCoder.encode([CONDITIONAL_ORDER_PARAMS_STRUCT], [params])
  );
}
