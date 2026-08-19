import { SupportedChainId } from '@cowprotocol/cow-sdk'
import { ChainNames } from '@cowprotocol/shared'
import { Erc20Repository } from '@cowprotocol/repositories'
import { getNotificationAmounts } from './getNotificationAmounts'

interface OrderInfoForNotificationParams {
  chainId: SupportedChainId
  isEthFlowOrder: boolean
  erc20Repository: Erc20Repository
  sellTokenAddress: string
  buyTokenAddress: string
  sellAmount: string | bigint
  buyAmount: string | bigint
}

export async function getNotificationSummary(params: OrderInfoForNotificationParams): Promise<string> {
  const { chainId } = params
  const amounts = await getNotificationAmounts(params)

  return `${amounts.sell} for ${amounts.buy} in ${ChainNames[chainId]}`
}
