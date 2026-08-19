import { formatAmount } from './format'

describe('formatAmount', () => {
  it('rounds token amounts to six fractional digits', () => {
    expect(formatAmount(66_521_634_923_361_445n, 18)).toBe('0.066522')
  })

  it('preserves precise values when the token has at most six decimals', () => {
    expect(formatAmount(123_456_789n, 6)).toBe('123.456789')
  })

  it('does not lose precision for large token amounts', () => {
    expect(formatAmount(123_456_789_012_345_678_901_234_567_890n, 18)).toBe('123456789012.345679')
  })

  it('shows non-zero amounts below the display threshold as dust', () => {
    expect(formatAmount(1n, 18)).toBe('<0.000001')
  })
})
