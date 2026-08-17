import { AnyAppDataDocVersion, OrderKind } from '@cowprotocol/cow-sdk'
import { NotificationOrder } from '@cowprotocol/repositories'

export function getOrderTitle(appData: AnyAppDataDocVersion | undefined, order: NotificationOrder | undefined) {
  const { metadata } = appData || {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderClass = (metadata as any)?.orderClass?.orderClass || 'unknown'

  switch (orderClass) {
    case 'market':
      return 'Swap order filled'
    case 'limit':
      return !isOrderFullyFilled(order) ? 'Limit order partially filled' : 'Limit order filled'
    case 'liquidity':
      // No longer used, should never happen
      return 'Liquidity order filled'
    case 'twap':
      return 'TWAP part is filled'
    default:
      // Order class not properly configured
      return 'Order filled'
  }
}

function isOrderFullyFilled(order: NotificationOrder | undefined): boolean {
  if (!order?.partiallyFillable) return true

  return order.kind === OrderKind.SELL
    ? BigInt(order.executedSellAmount) >= BigInt(order.sellAmount)
    : BigInt(order.executedBuyAmount) >= BigInt(order.buyAmount)
}
