import { OrderKind } from '@cowprotocol/cow-sdk'
import { NotificationOrder } from '@cowprotocol/repositories'
import { formatOrderNotification, ORDER_NOTIFICATION_EMOJI } from './formatOrderNotification'

type FormattedAmounts = { sell: string; buy: string }

interface FormatTradeNotificationParams {
  orderClass: string
  timestamp: bigint
  account: string
  recipient?: string | null
  chainName: string
  tradeAmounts: FormattedAmounts
  order?: Pick<
    NotificationOrder,
    'partiallyFillable' | 'kind' | 'sellAmount' | 'buyAmount' | 'executedSellAmount' | 'executedBuyAmount'
  >
  orderAmounts?: FormattedAmounts
  executedAmounts?: FormattedAmounts
}

export function formatTradeNotification({
  orderClass,
  timestamp,
  account,
  recipient,
  chainName,
  tradeAmounts,
  order,
  orderAmounts,
  executedAmounts,
}: FormatTradeNotificationParams) {
  const notification = (title: string, message: string) =>
    formatOrderNotification({ title, message, timestamp, account, recipient, chainName })

  switch (orderClass) {
    case 'market':
      return notification(`${ORDER_NOTIFICATION_EMOJI.completed} Swap filled`, tradeMessage(tradeAmounts))
    case 'limit':
      if (!isOrderFullyFilled(order)) {
        return notification(
          `${ORDER_NOTIFICATION_EMOJI.partiallyFilled} Limit order partially filled`,
          order && orderAmounts
            ? `Your limit order to trade ${orderAmounts.sell} → ${orderAmounts.buy} is now ${fillPercentage(
                order
              )}% filled.`
            : tradeMessage(tradeAmounts)
        )
      }

      return notification(
        `${ORDER_NOTIFICATION_EMOJI.completed} Limit order filled`,
        order && orderAmounts && executedAmounts
          ? `Your limit order to trade ${orderAmounts.sell} → ${orderAmounts.buy} is now 100% filled. You received ${executedAmounts.buy}.`
          : tradeMessage(tradeAmounts)
      )
    case 'twap':
      return notification(
        `${ORDER_NOTIFICATION_EMOJI.completed} A TWAP part filled`,
        `One part of your TWAP order filled. ${tradeMessage(tradeAmounts)}`
      )
    case 'liquidity':
      return notification(`${ORDER_NOTIFICATION_EMOJI.completed} Liquidity order filled`, tradeMessage(tradeAmounts))
    default:
      return notification(`${ORDER_NOTIFICATION_EMOJI.completed} Order filled`, tradeMessage(tradeAmounts))
  }
}

function tradeMessage({ sell, buy }: FormattedAmounts) {
  return `You traded ${sell} and received ${buy}.`
}

function fillPercentage(order: NonNullable<FormatTradeNotificationParams['order']>) {
  const [executedAmount, totalAmount] =
    order.kind === OrderKind.SELL
      ? [order.executedSellAmount, order.sellAmount]
      : [order.executedBuyAmount, order.buyAmount]

  return (BigInt(executedAmount) * 100n) / BigInt(totalAmount)
}

function isOrderFullyFilled(order: FormatTradeNotificationParams['order']): boolean {
  if (!order?.partiallyFillable) return true

  return order.kind === OrderKind.SELL
    ? BigInt(order.executedSellAmount) >= BigInt(order.sellAmount)
    : BigInt(order.executedBuyAmount) >= BigInt(order.buyAmount)
}
