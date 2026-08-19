import { AnyAppDataDocVersion } from '@cowprotocol/cow-sdk'
import { getOrderClass } from './getOrderClass'

describe('getOrderClass', () => {
  it.each([
    [{ metadata: { orderClass: { orderClass: 'market' } } }, 'market'],
    [{ metadata: { orderClass: { orderClass: 'limit' } } }, 'limit'],
    [{ metadata: { orderClass: { orderClass: 'twap' } } }, 'twap'],
    [{}, 'unknown'],
  ])('extracts the order class', (metadata, expected) => {
    expect(getOrderClass(metadata as AnyAppDataDocVersion)).toBe(expected)
  })
})
