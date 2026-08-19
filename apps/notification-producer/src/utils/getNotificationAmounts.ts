import { EVM_NATIVE_CURRENCY_ADDRESS, getAddressKey, SupportedChainId } from '@cowprotocol/cow-sdk'
import { Erc20Repository } from '@cowprotocol/repositories'
import { formatAmount, formatTokenName } from '@cowprotocol/shared'

interface GetNotificationAmountsParams {
  chainId: SupportedChainId
  isEthFlowOrder: boolean
  erc20Repository: Erc20Repository
  sellTokenAddress: string
  buyTokenAddress: string
  sellAmount: string | bigint
  buyAmount: string | bigint
}

export async function getNotificationAmounts({
  chainId,
  isEthFlowOrder,
  erc20Repository,
  sellTokenAddress,
  buyTokenAddress,
  sellAmount,
  buyAmount,
}: GetNotificationAmountsParams) {
  const sellToken = await erc20Repository.get(
    chainId,
    isEthFlowOrder ? getAddressKey(EVM_NATIVE_CURRENCY_ADDRESS) : getAddressKey(sellTokenAddress)
  )
  const buyToken = await erc20Repository.get(chainId, getAddressKey(buyTokenAddress))

  return {
    sell: `${formatAmount(BigInt(sellAmount), sellToken?.decimals)} ${formatTokenName(sellToken)}`,
    buy: `${formatAmount(BigInt(buyAmount), buyToken?.decimals)} ${formatTokenName(buyToken)}`,
  }
}
