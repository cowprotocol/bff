import { EVM_NATIVE_CURRENCY_ADDRESS, SupportedChainId } from '@cowprotocol/cow-sdk'
import { getAddressOrPlatform, getCoingeckoPlatform } from './coingeckoUtils'

describe('getCoingeckoPlatform', () => {
  it('returns undefined for Sepolia, which is explicitly unsupported by CoinGecko', () => {
    expect(getCoingeckoPlatform(SupportedChainId.SEPOLIA.toString())).toBeUndefined()
  })

  it('preserves the input for unmapped numeric chain IDs', () => {
    expect(getCoingeckoPlatform('123456')).toBe('123456')
  })
})

describe('getAddressOrPlatform', () => {
  it('uses the platform lookup for the EVM native-currency placeholder', () => {
    expect(getAddressOrPlatform(EVM_NATIVE_CURRENCY_ADDRESS, 'ethereum')).toBe('ethereum')
  })
})
