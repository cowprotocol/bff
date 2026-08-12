import { SupportedChainId } from '@cowprotocol/cow-sdk'
import { getCoingeckoPlatform } from './coingeckoUtils'

describe('getCoingeckoPlatform', () => {
  it('returns undefined for Sepolia, which is explicitly unsupported by CoinGecko', () => {
    expect(getCoingeckoPlatform(SupportedChainId.SEPOLIA.toString())).toBeUndefined()
  })

  it('preserves the input for unmapped numeric chain IDs', () => {
    expect(getCoingeckoPlatform('123456')).toBe('123456')
  })
})
