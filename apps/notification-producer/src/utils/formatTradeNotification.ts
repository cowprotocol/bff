import { OrderKind } from '@cowprotocol/cow-sdk'
import { NotificationOrder } from '@cowprotocol/repositories'

type FormattedAmounts = { sell: string; buy: string }

interface FormatTradeNotificationParams {
  orderTitle: string
  timestamp: bigint
  account: string
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
  chainName,
  tradeAmounts,
  order,
  orderAmounts,
  executedAmounts,
}: FormatTradeNotificationParams) {
  const time = new Date(Number(timestamp) * 1000).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  })
  const metadata = `Account: ${account}\nChain: ${chainName}`

  switch (orderTitle) {
    case 'Swap order filled':
      return notification(`Swap filled at ${time} UTC`, tradeMessage(tradeAmounts), metadata)
    case 'Limit order filled':
      return notification(
        `Limit order filled at ${time} UTC`,
        order && orderAmounts && executedAmounts
          ? `Your limit order to trade ${orderAmounts.sell} → ${orderAmounts.buy} is now 100% filled. You received ${executedAmounts.buy}.`
          : tradeMessage(tradeAmounts),
        metadata
      )
    case 'Limit order partially filled':
      return notification(
        `Limit order partially filled at ${time} UTC`,
        order && orderAmounts
          ? `Your limit order to trade ${orderAmounts.sell} → ${orderAmounts.buy} is now ${fillPercentage(
              order
            )}% filled.`
          : tradeMessage(tradeAmounts),
        metadata
      )
    case 'TWAP part is filled':
      return notification(
        `A TWAP part filled at ${time} UTC`,
        `One part of your TWAP order filled. ${tradeMessage(tradeAmounts)}`,
        metadata
      )
    default:
      return notification(`${orderTitle} at ${time} UTC`, tradeMessage(tradeAmounts), metadata)
  }
}

function notification(title: string, message: string, metadata: string) {
  return { title, message: `${message}\n\n${metadata}` }
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
