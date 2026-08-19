import { AnyAppDataDocVersion } from '@cowprotocol/cow-sdk'
import { formatExpiredOrderNotification } from './formatExpiredOrderNotification'

const common = {
  timestamp: 1_755_607_320,
  account: '0x1234567890123456789012345678901234567890',
  recipient: '0x0000000000000000000000000000000000000001',
  chainName: 'Arbitrum One',
  orderAmounts: { sell: '10 USDC', buy: '1 COW' },
}

function appData(orderClass: string): AnyAppDataDocVersion {
  return { metadata: { orderClass: { orderClass } } } as AnyAppDataDocVersion
}

describe('formatExpiredOrderNotification', () => {
  it.each([
    ['market', '⏱️ Swap expired at 12:42 UTC', 'Your swap to trade 10 USDC → 1 COW has expired.'],
    ['limit', '⏱️ Limit order expired at 12:42 UTC', 'Your limit order to trade 10 USDC → 1 COW has expired.'],
    ['twap', '⏱️ TWAP order expired at 12:42 UTC', 'Your TWAP order to trade 10 USDC → 1 COW has expired.'],
    ['unknown', '⏱️ Order expired at 12:42 UTC', 'Your order to trade 10 USDC → 1 COW has expired.'],
  ])('formats %s order expiry', (orderClass, title, message) => {
    expect(formatExpiredOrderNotification({ ...common, appData: appData(orderClass) })).toEqual({
      title,
      message:
        message +
        '\n\nAccount: 0x1234567890123456789012345678901234567890\nRecipient: 0x0000000000000000000000000000000000000001\nChain: Arbitrum One',
    })
  })
})
