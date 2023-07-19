import { OrderStatus, OrderStruct } from '../types/order';

/**
 * Returns if the order is fulfilled.
 *
 * @param executedSellAmount Current executed sell amount.
 * @param orderInfo OrderStruct of the order.
 * @returns If the order is fulfilled.
 */
function isOrderFulfilled(
  executedSellAmount: bigint,
  orderInfo: OrderStruct
): boolean {
  return (
    executedSellAmount ===
    BigInt(orderInfo.partSellAmount) * BigInt(orderInfo.n)
  );
}

/**
 * Returns if the order is expired.
 *
 * @param order OrderStruct of the order.
 * @param blockTimestamp Current block timestamp.
 * @returns If the order is expired.
 */
function isOrderExpired(order: OrderStruct, blockTimestamp: Date): boolean {
  const startTime = Math.ceil(blockTimestamp.getTime() / 1000);
  const { n: numOfParts, t: timeInterval } = order;
  const endTime = startTime + timeInterval * numOfParts;
  const nowTimestamp = Math.ceil(Date.now() / 1000);

  return nowTimestamp > endTime;
}

/**
 * Returns the status of the order.
 *
 * @param executedSellAmount Current executed sell amount.
 * @param orderInfo OrderStruct of the order.
 * @param blockTimestamp Current block timestamp.
 * @param singleOrder Value of singleOrders mapping from ComposableCoW for the order.
 * @returns {OrderStatus} The status of the order.
 */
export function getOrderStatus(
  executedSellAmount: bigint,
  orderInfo: OrderStruct,
  blockTimestamp: Date,
  singleOrder: boolean
): OrderStatus {
  if (isOrderFulfilled(executedSellAmount, orderInfo)) {
    return OrderStatus.Fulfilled;
  }

  if (!singleOrder) {
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
