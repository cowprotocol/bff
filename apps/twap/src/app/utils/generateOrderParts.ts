import {
  BuyTokenDestination,
  OrderKind,
  OrderParameters,
  SellTokenSource,
  SupportedChainId,
} from '@cowprotocol/cow-sdk';
import { OrderPart, OrderStruct } from '../types/order';
import { calculateValidTo } from './calculateValidTo';
import { computeOrderUid } from './computeOrderUid';

export async function generateOrderParts(
  orderId: string,
  {
    sellToken,
    buyToken,
    receiver,
    partSellAmount,
    minPartLimit,
    n,
    t,
    span,
    appData,
  }: OrderStruct,
  blockTimestamp: Date,
  chainId: SupportedChainId,
  safeAddress: string
): Promise<OrderPart[]> {
  return await Promise.all(
    [...new Array(n)].map(async (_, index) => {
      const startTime = Math.ceil(blockTimestamp.getTime() / 1000);
      const validTo = calculateValidTo({
        part: index,
        startTime,
        span,
        frequency: t,
      });
      const parameters: OrderParameters = {
        sellToken,
        buyToken,
        receiver,
        sellAmount: partSellAmount,
        buyAmount: minPartLimit,
        validTo,
        appData,
        feeAmount: '0',
        kind: OrderKind.SELL,
        partiallyFillable: false,
        sellTokenBalance: SellTokenSource.ERC20,
        buyTokenBalance: BuyTokenDestination.ERC20,
      };
      const uid = await computeOrderUid(chainId, safeAddress, parameters);

      return {
        uid,
        index: index,
        orderId,
        chainId,
        safeAddress,
        order: parameters,
      };
    })
  );
}
