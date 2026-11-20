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
    expect(isFlatPriceHistory(Array.from({ length: 10 }, (_, i) => bar(1, i)))).toBe(true)
  })

  it.each<[string, PriceHistoryBar[]]>([
    ['an empty window', []],
    ['a single bar', [bar(1, 1)]],
    ['a window too short to tell a placeholder from a quiet market', [bar(1, 1), bar(1, 2), bar(1, 3)]],
    ['closes that differ', Array.from({ length: 10 }, (_, i) => bar(i === 5 ? 1.0001 : 1, i))],
    [
      'a bar that moved within itself',
      Array.from({ length: 10 }, (_, i) =>
        i === 5 ? { timestamp: i, open: 1, high: 1.0001, low: 1, close: 1 } : bar(1, i)
      ),
    ],
  ])('does not report %s', (_case, bars) => {
    expect(isFlatPriceHistory(bars)).toBe(false)
  })
})
