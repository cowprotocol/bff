import { areAddressesEqual } from '@cowprotocol/cow-sdk'

export const ORDER_NOTIFICATION_EMOJI = {
  completed: '✅',
  partiallyFilled: '⏳',
  expired: '⏱️',
} as const

interface FormatOrderNotificationParams {
  title: string
  message: string
  timestamp: bigint
  account: string
  recipient?: string | null
  chainName: string
}

export function formatOrderNotification({
  title,
  message,
  timestamp,
  account,
  recipient,
  chainName,
}: FormatOrderNotificationParams) {
  const time = new Date(Number(timestamp) * 1000).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  })
  const recipientMetadata =
    recipient && !areAddressesEqual(account, recipient) ? `\nRecipient: ${abbreviateAddress(recipient)}` : ''

  return {
    title: `${title} at ${time} UTC`,
    message: `${message}\n\nAccount: ${abbreviateAddress(account)}${recipientMetadata}\nChain: ${chainName}`,
  }
}

function abbreviateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}
