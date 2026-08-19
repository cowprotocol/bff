import { AnyAppDataDocVersion } from '@cowprotocol/cow-sdk'
import { formatOrderNotification } from '../../utils/formatOrderNotification'
import { getOrderClass } from '../../utils/getOrderTitle'

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
      return { title: 'Swap expired', orderType: 'swap' }
    case 'limit':
      return { title: 'Limit order expired', orderType: 'limit order' }
    case 'twap':
      return { title: 'TWAP order expired', orderType: 'TWAP order' }
    default:
      return { title: 'Order expired', orderType: 'order' }
  }
}
