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

  const formatted = formatUnits(amount, decimals)
  if (decimals <= MAX_DISPLAY_DECIMALS) return formatted

  return roundToDisplayPrecision(formatted)
}

function roundToDisplayPrecision(formatted: string) {
  const [integer, fraction = ''] = formatted.split('.')
  if (fraction.length <= MAX_DISPLAY_DECIMALS) return formatted

  let roundedInteger = integer
  let roundedFraction = fraction.slice(0, MAX_DISPLAY_DECIMALS)

  if (fraction[MAX_DISPLAY_DECIMALS] >= '5') {
    roundedFraction = incrementDecimalString(roundedFraction)
    if (roundedFraction.length > MAX_DISPLAY_DECIMALS) {
      roundedInteger = incrementDecimalString(integer)
      roundedFraction = '0'.repeat(MAX_DISPLAY_DECIMALS)
    }
  }

  roundedFraction = roundedFraction.replace(/0+$/, '')
  if (roundedInteger === '0' && roundedFraction.length === 0) return '<0.000001'

  return roundedFraction ? `${roundedInteger}.${roundedFraction}` : roundedInteger
}

function incrementDecimalString(value: string) {
  let carry = 1
  const digits = value.split('')

  for (let index = digits.length - 1; index >= 0 && carry; index--) {
    const digit = digits[index].charCodeAt(0) - 48 + carry
    digits[index] = String(digit % 10)
    carry = digit >= 10 ? 1 : 0
  }

  return carry ? `1${digits.join('')}` : digits.join('')
}

export function formatTokenName(token: { symbol?: string; address: string } | null) {
  return token?.symbol ? `${token.symbol}` : token?.address
}
