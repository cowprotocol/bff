import { getLatestTradeLogs } from './getTradeNotifications'

describe('getLatestTradeLogs', () => {
  it('retains only the latest fill for each order', () => {
    const firstFill = { eventName: 'Trade', blockNumber: 10n, logIndex: 1, args: { orderUid: '0xorder-a' } }
    const otherOrderFill = { eventName: 'Trade', blockNumber: 10n, logIndex: 2, args: { orderUid: '0xorder-b' } }
    const latestFill = { eventName: 'Trade', blockNumber: 11n, logIndex: 1, args: { orderUid: '0xorder-a' } }

    expect(getLatestTradeLogs([firstFill, otherOrderFill, latestFill])).toEqual([otherOrderFill, latestFill])
  })
})
