import { OrderStatus, OrderStruct } from '../types/order';

function isOrderFulfilled(executedSellAmount: bigint, orderInfo: OrderStruct) {
  return (
    executedSellAmount ===
    BigInt(orderInfo.partSellAmount) * BigInt(orderInfo.n)
  );
}

function isOrderExpired(order: OrderStruct, blockTimestamp: Date): boolean {
  const startTime = Math.ceil(blockTimestamp.getTime() / 1000);
  const { n: numOfParts, t: timeInterval } = order;
  const endTime = startTime + timeInterval * numOfParts;
  const nowTimestamp = Math.ceil(Date.now() / 1000);

  return nowTimestamp > endTime;
}

export function getOrderStatus(
  executedSellAmount: bigint,
  orderInfo: OrderStruct,
  blockTimestamp: Date,
  singleOrder: boolean
): OrderStatus {
  if (isOrderFulfilled(executedSellAmount, orderInfo)) {
    return OrderStatus.Fulfilled;
  }

  if (singleOrder === false) {
    return OrderStatus.Cancelled;
  }

  if (isOrderExpired(orderInfo, blockTimestamp)) {
    return OrderStatus.Expired;
  }

  if (!blockTimestamp) {
    return OrderStatus.WaitSigning;
  }

  return OrderStatus.Pending;
}
