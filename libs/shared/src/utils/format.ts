import { formatUnits } from 'viem'

import { EvmChainId, EXPLORER_NETWORK_NAMES } from '../const'
import { SupportedChainId } from '@cowprotocol/cow-sdk'

const MAX_DISPLAY_DECIMALS = 6

export function getExplorerUrl(chainId: SupportedChainId, orderUid: string) {
  const baseUrl = getExplorerBaseUrl(chainId)
  return `${baseUrl}/orders/${orderUid}`
}

export function getExplorerBaseUrl(chainId: SupportedChainId) {
  const suffix = chainId === SupportedChainId.MAINNET ? '' : `/${EXPLORER_NETWORK_NAMES[chainId as EvmChainId]}`
  return `https://explorer.cow.fi${suffix}`
}

export function formatAmount(amount: bigint, decimals: number | undefined) {
  if (decimals === undefined) return amount.toString()
  if (decimals <= MAX_DISPLAY_DECIMALS) return formatUnits(amount, decimals)

  const divisor = 10n ** BigInt(decimals - MAX_DISPLAY_DECIMALS)
  const rounded = (amount + divisor / 2n) / divisor

  return amount > 0n && rounded === 0n ? '<0.000001' : formatUnits(rounded, MAX_DISPLAY_DECIMALS)
}

export function formatTokenName(token: { symbol?: string; address: string } | null) {
  return token?.symbol ? `${token.symbol}` : token?.address
}
