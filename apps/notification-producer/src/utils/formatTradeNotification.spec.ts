import { OrderKind } from '@cowprotocol/cow-sdk'
import { formatTradeNotification } from './formatTradeNotification'

const common = {
  timestamp: 1_755_607_320n,
  account: '0x1234567890123456789012345678901234567890',
  chainName: 'Arbitrum One',
  tradeAmounts: { sell: '10 USDC', buy: '1 COW' },
}

describe('formatTradeNotification', () => {
  it('formats a swap notification', () => {
    expect(formatTradeNotification({ ...common, orderTitle: 'Swap order filled' })).toEqual({
      title: 'Swap filled at 12:42 UTC',
      message:
        'You traded 10 USDC and received 1 COW.\n\nAccount: 0x1234567890123456789012345678901234567890\nChain: Arbitrum One',
    })
  })

  it('includes a custom recipient', () => {
    expect(
      formatTradeNotification({
        ...common,
        orderTitle: 'Swap order filled',
        recipient: '0x0000000000000000000000000000000000000001',
      })
    ).toEqual({
      title: 'Swap filled at 12:42 UTC',
      message:
        'You traded 10 USDC and received 1 COW.\n\nAccount: 0x1234567890123456789012345678901234567890\nRecipient: 0x0000000000000000000000000000000000000001\nChain: Arbitrum One',
    })
  })

  it('omits a recipient that matches the account', () => {
    expect(
      formatTradeNotification({
        ...common,
        account: '0xAaaAaAaaAaAaaAaAaaAaAaaAaAaaAaAaaAaAaaAa',
        orderTitle: 'Swap order filled',
        recipient: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      })
    ).toEqual({
      title: 'Swap filled at 12:42 UTC',
      message:
        'You traded 10 USDC and received 1 COW.\n\nAccount: 0xAaaAaAaaAaAaaAaAaaAaAaaAaAaaAaAaaAaAaaAa\nChain: Arbitrum One',
    })
  })

  it('formats a completely filled limit order', () => {
    expect(
      formatTradeNotification({
        ...common,
        orderTitle: 'Limit order filled',
        order: {
          kind: OrderKind.SELL,
          sellAmount: '1000',
          buyAmount: '100000',
          executedSellAmount: '1000',
          executedBuyAmount: '100001',
        },
        orderAmounts: { sell: '1000 USDC', buy: '100000 COW' },
        executedAmounts: { sell: '1000 USDC', buy: '100001 COW' },
      })
    ).toEqual({
      title: 'Limit order filled at 12:42 UTC',
      message:
        'Your limit order to trade 1000 USDC → 100000 COW is now 100% filled. You received 100001 COW.\n\nAccount: 0x1234567890123456789012345678901234567890\nChain: Arbitrum One',
    })
  })

  it('formats a partially filled limit order with its completion percentage', () => {
    expect(
      formatTradeNotification({
        ...common,
        orderTitle: 'Limit order partially filled',
        order: {
          kind: OrderKind.SELL,
          sellAmount: '100',
          buyAmount: '1000',
          executedSellAmount: '53',
          executedBuyAmount: '530',
        },
        orderAmounts: { sell: '100 USDC', buy: '1000 COW' },
      })
    ).toEqual({
      title: 'Limit order partially filled at 12:42 UTC',
      message:
        'Your limit order to trade 100 USDC → 1000 COW is now 53% filled.\n\nAccount: 0x1234567890123456789012345678901234567890\nChain: Arbitrum One',
    })
  })

  it('formats a TWAP notification without an unavailable part count', () => {
    expect(formatTradeNotification({ ...common, orderTitle: 'TWAP part is filled' })).toEqual({
      title: 'A TWAP part filled at 12:42 UTC',
      message:
        'One part of your TWAP order filled. You traded 10 USDC and received 1 COW.\n\nAccount: 0x1234567890123456789012345678901234567890\nChain: Arbitrum One',
    })
  })
})
