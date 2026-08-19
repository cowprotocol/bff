import { AnyAppDataDocVersion } from '@cowprotocol/cow-sdk'
import { formatOrderNotification, ORDER_NOTIFICATION_EMOJI } from '../../utils/formatOrderNotification'
import { getOrderClass } from '../../utils/getOrderClass'

interface FormatExpiredOrderNotificationParams {
  appData?: AnyAppDataDocVersion
  timestamp: number
  account: string
  recipient?: string | null
  chainName: string
  orderAmounts: { sell: string; buy: string }
}

export function formatExpiredOrderNotification({
  appData,
  timestamp,
  account,
  recipient,
  chainName,
  orderAmounts,
}: FormatExpiredOrderNotificationParams) {
  const { title, orderType } = getExpiredOrderCopy(getOrderClass(appData))

  return formatOrderNotification({
    title,
    message: `Your ${orderType} to trade ${orderAmounts.sell} → ${orderAmounts.buy} has expired.`,
    timestamp: BigInt(timestamp),
    account,
    recipient,
    chainName,
  })
}

function getExpiredOrderCopy(orderClass: string) {
  switch (orderClass) {
    case 'market':
      return { title: `${ORDER_NOTIFICATION_EMOJI.expired} Swap expired`, orderType: 'swap' }
    case 'limit':
      return { title: `${ORDER_NOTIFICATION_EMOJI.expired} Limit order expired`, orderType: 'limit order' }
    case 'twap':
      return { title: `${ORDER_NOTIFICATION_EMOJI.expired} TWAP order expired`, orderType: 'TWAP order' }
    default:
      return { title: `${ORDER_NOTIFICATION_EMOJI.expired} Order expired`, orderType: 'order' }
  }
}
