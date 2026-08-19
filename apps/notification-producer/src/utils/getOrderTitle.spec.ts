import { AnyAppDataDocVersion, Order, OrderKind } from '@cowprotocol/cow-sdk'
import { getOrderClass, getOrderTitle } from './getOrderTitle'

const appData = {
  metadata: { orderClass: { orderClass: 'limit' } },
} as AnyAppDataDocVersion

function order(overrides: Partial<Order>): Order {
  return {
    uid: '0xorder',
    partiallyFillable: true,
    kind: OrderKind.SELL,
    sellAmount: '100',
    buyAmount: '100',
    executedSellAmount: '50',
    executedBuyAmount: '0',
    ...overrides,
  } as Order
}

describe('getOrderTitle', () => {
  it.each([
    [{ metadata: { orderClass: { orderClass: 'market' } } }, 'market'],
    [{ metadata: { orderClass: { orderClass: 'limit' } } }, 'limit'],
    [{ metadata: { orderClass: { orderClass: 'twap' } } }, 'twap'],
    [{}, 'unknown'],
  ])('extracts the order class', (metadata, expected) => {
    expect(getOrderClass(metadata as AnyAppDataDocVersion)).toBe(expected)
  })

  it.each([
    [order({}), 'Limit order partially filled'],
    [order({ executedSellAmount: '100' }), 'Limit order filled'],
    [order({ kind: OrderKind.BUY, executedSellAmount: '0', executedBuyAmount: '50' }), 'Limit order partially filled'],
    [order({ kind: OrderKind.BUY, executedSellAmount: '0', executedBuyAmount: '100' }), 'Limit order filled'],
  ])('labels a partially-fillable limit order according to its completed amount', (notificationOrder, expected) => {
    expect(getOrderTitle(appData, notificationOrder)).toBe(expected)
  })
})
