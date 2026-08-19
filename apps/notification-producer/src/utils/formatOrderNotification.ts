import { areAddressesEqual } from '@cowprotocol/cow-sdk'

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
  const recipientMetadata = recipient && !areAddressesEqual(account, recipient) ? `\nRecipient: ${recipient}` : ''

  return {
    title: `${title} at ${time} UTC`,
    message: `${message}\n\nAccount: ${account}${recipientMetadata}\nChain: ${chainName}`,
  }
}
