import { formatOrderNotification } from './formatOrderNotification'

describe('formatOrderNotification', () => {
  it('formats shared order metadata with a distinct recipient', () => {
    expect(
      formatOrderNotification({
        title: 'Swap expired',
        message: 'Your swap to trade 10 USDC → 1 COW has expired.',
        timestamp: 1_755_607_320n,
        account: '0x1234567890123456789012345678901234567890',
        recipient: '0x0000000000000000000000000000000000000001',
        chainName: 'Arbitrum One',
      })
    ).toEqual({
      title: 'Swap expired at 12:42 UTC',
      message:
        'Your swap to trade 10 USDC → 1 COW has expired.\n\nAccount: 0x1234...7890\nRecipient: 0x0000...0001\nChain: Arbitrum One',
    })
  })

  it('omits a recipient that matches the account', () => {
    expect(
      formatOrderNotification({
        title: 'Order expired',
        message: 'Your order has expired.',
        timestamp: 1_755_607_320n,
        account: '0xAaaAaAaaAaAaaAaAaaAaAaaAaAaaAaAaaAaAaaAa',
        recipient: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        chainName: 'Arbitrum One',
      })
    ).toMatchObject({
      message: 'Your order has expired.\n\nAccount: 0xAaaA...aaAa\nChain: Arbitrum One',
    })
  })
})
