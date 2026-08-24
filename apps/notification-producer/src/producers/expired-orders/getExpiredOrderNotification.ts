import { PushNotification } from '@cowprotocol/notifications'
import { Erc20Repository, ParsedExpiredOrder } from '@cowprotocol/repositories'
import { ChainNames, getExplorerUrl } from '@cowprotocol/shared'
import { AnyAppDataDocVersion, type SupportedChainId } from '@cowprotocol/cow-sdk'
import { getNotificationAmounts } from '../../utils/getNotificationAmounts'
import { formatExpiredOrderNotification } from './formatExpiredOrderNotification'

export interface ExpiredOrderNotificationContext {
  chainId: SupportedChainId
  nowTimestamp: number
  lastCheckTimestamp: number
  isEthFlowOrder: boolean
  owner: string
  erc20Repository: Erc20Repository
}

export async function getExpiredOrderNotification(
  expiredOrder: ParsedExpiredOrder,
  notificationContext: ExpiredOrderNotificationContext,
  appData?: AnyAppDataDocVersion
): Promise<PushNotification> {
  const { chainId, lastCheckTimestamp, nowTimestamp, isEthFlowOrder, owner, erc20Repository } = notificationContext

  const orderAmounts = await getNotificationAmounts({
    chainId,
    isEthFlowOrder,
    erc20Repository,
    sellAmount: expiredOrder.sellAmount,
    buyAmount: expiredOrder.buyAmount,
    sellTokenAddress: expiredOrder.sellTokenAddress,
    buyTokenAddress: expiredOrder.buyTokenAddress,
  })

  const { title, message } = formatExpiredOrderNotification({
    appData,
    timestamp: expiredOrder.validTo,
    account: owner,
    recipient: expiredOrder.receiver,
    chainName: ChainNames[chainId],
    orderAmounts,
  })

  const url = getExplorerUrl(chainId, expiredOrder.uid)

  return {
    id: 'OrderExpired-' + expiredOrder.uid + '-' + expiredOrder.validTo + '-' + lastCheckTimestamp,
    // Use the resolved owner (not expiredOrder.owner): for eth-flow orders expiredOrder.owner is the
    // eth-flow contract address, not the actual trader who should receive the notification.
    account: owner,
    title,
    message,
    url,
    context: {
      chainId: chainId.toString(),
      nowTimestamp: nowTimestamp.toString(),
    },
  }
}
