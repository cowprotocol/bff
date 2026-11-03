import { isFlatPriceHistory, PriceHistoryBar } from './priceHistory.types'

const bar = (price: number, timestamp: number): PriceHistoryBar => ({
  timestamp,
  open: price,
  high: price,
  low: price,
  close: price,
})

describe('isFlatPriceHistory', () => {
  it('reports a window that carries a single price', () => {
    expect(isFlatPriceHistory([bar(1, 1), bar(1, 2), bar(1, 3)])).toBe(true)
  })

  it.each<[string, PriceHistoryBar[]]>([
    ['an empty window', []],
    ['a single bar', [bar(1, 1)]],
    ['closes that differ', [bar(1, 1), bar(1.0001, 2)]],
    ['a bar that moved within itself', [bar(1, 1), { timestamp: 2, open: 1, high: 1.0001, low: 1, close: 1 }]],
  ])('does not report %s', (_case, bars) => {
    expect(isFlatPriceHistory(bars)).toBe(false)
  })
})
