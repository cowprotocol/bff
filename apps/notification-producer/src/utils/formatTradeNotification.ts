import { OrderKind } from '@cowprotocol/cow-sdk'
import { NotificationOrder } from '@cowprotocol/repositories'
import { formatOrderNotification } from './formatOrderNotification'

type FormattedAmounts = { sell: string; buy: string }

interface FormatTradeNotificationParams {
  orderTitle: string
  timestamp: bigint
  account: string
  recipient?: string | null
  chainName: string
  tradeAmounts: FormattedAmounts
  order?: Pick<NotificationOrder, 'kind' | 'sellAmount' | 'buyAmount' | 'executedSellAmount' | 'executedBuyAmount'>
  orderAmounts?: FormattedAmounts
  executedAmounts?: FormattedAmounts
}

export function formatTradeNotification({
  orderTitle,
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

  switch (orderTitle) {
    case 'Swap order filled':
      return notification('Swap filled', tradeMessage(tradeAmounts))
    case 'Limit order filled':
      return notification(
        'Limit order filled',
        order && orderAmounts && executedAmounts
          ? `Your limit order to trade ${orderAmounts.sell} → ${orderAmounts.buy} is now 100% filled. You received ${executedAmounts.buy}.`
          : tradeMessage(tradeAmounts)
      )
    case 'Limit order partially filled':
      return notification(
        'Limit order partially filled',
        order && orderAmounts
          ? `Your limit order to trade ${orderAmounts.sell} → ${orderAmounts.buy} is now ${fillPercentage(
              order
            )}% filled.`
          : tradeMessage(tradeAmounts)
      )
    case 'TWAP part is filled':
      return notification('A TWAP part filled', `One part of your TWAP order filled. ${tradeMessage(tradeAmounts)}`)
    default:
      return notification(orderTitle, tradeMessage(tradeAmounts))
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
