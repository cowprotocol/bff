import { AnyAppDataDocVersion, SupportedChainId } from '@cowprotocol/cow-sdk'
import { PushNotification } from '@cowprotocol/notifications'
import { Erc20Repository, NotificationOrder } from '@cowprotocol/repositories'
import { ChainNames, getExplorerUrl, logger } from '@cowprotocol/shared'
import { formatTradeNotification } from '../../utils/formatTradeNotification'
import { getNotificationAmounts } from '../../utils/getNotificationAmounts'
import { getOrderTitle } from '../../utils/getOrderTitle'

export async function fromTradeToNotification(props: {
  prefix: string
  id: string
  isEthFlowOrder: boolean
  chainId: SupportedChainId
  orderUid: string
  owner: string
  sellTokenAddress: string
  buyTokenAddress: string
  sellAmount: bigint
  buyAmount: bigint
  feeAmount: bigint
  erc20Repository: Erc20Repository
  transactionHash: string
  logIndex: number
  timestamp: bigint
  order?: NotificationOrder
  appData?: AnyAppDataDocVersion
}): Promise<PushNotification> {
  const {
    id,
    chainId,
    owner,
    isEthFlowOrder,
    sellTokenAddress,
    buyTokenAddress,
    sellAmount,
    buyAmount,
    erc20Repository,
    prefix,
    orderUid,
    transactionHash,
    logIndex,
    timestamp,
    appData,
    order,
  } = props

  const tradeAmounts = await getNotificationAmounts({
    chainId,
    isEthFlowOrder,
    erc20Repository,
    sellTokenAddress,
    buyTokenAddress,
    sellAmount,
    buyAmount,
  })
  const orderAmounts = order
    ? await getNotificationAmounts({
        chainId,
        isEthFlowOrder,
        erc20Repository,
        sellTokenAddress,
        buyTokenAddress,
        sellAmount: order.sellAmount,
        buyAmount: order.buyAmount,
      })
    : undefined
  const executedAmounts = order
    ? await getNotificationAmounts({
        chainId,
        isEthFlowOrder,
        erc20Repository,
        sellTokenAddress,
        buyTokenAddress,
        sellAmount: order.executedSellAmount,
        buyAmount: order.executedBuyAmount,
      })
    : undefined

  const notification = formatTradeNotification({
    orderTitle: getOrderTitle(appData, order),
    timestamp,
    account: owner,
    chainName: ChainNames[chainId],
    tradeAmounts,
    order,
    orderAmounts,
    executedAmounts,
  })

  const url = orderUid ? getExplorerUrl(chainId, orderUid) : undefined
  logger.info(
    `${prefix} New ${notification.title} for ${owner}. Tx=${transactionHash}, logIndex=${logIndex}, ${notification.message}`
  )
  return {
    id,
    account: owner,
    title: notification.title,
    message: notification.message,
    url,
    context: {
      transactionHash,
      logIndex: logIndex.toString(),
    },
  }
}
