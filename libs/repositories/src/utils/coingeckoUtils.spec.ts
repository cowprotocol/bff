import { AllChainIds } from '@cowprotocol/shared'
import { EVM_NATIVE_CURRENCY_ADDRESS, SupportedChainId } from '@cowprotocol/cow-sdk'
import { KNOWN_COINGECKO_PLATFORMS } from '../datasources/coingecko'
import {
  getAddressOrPlatform,
  getCoingeckoPlatform,
  getNativeCoinId,
  getSupportedCoingeckoChainId,
} from './coingeckoUtils'

describe('getCoingeckoPlatform', () => {
  it('returns undefined for Sepolia, which is explicitly unsupported by CoinGecko', () => {
    expect(getCoingeckoPlatform(SupportedChainId.SEPOLIA.toString())).toBeUndefined()
  })

  it('resolves known chain ids to their platform', () => {
    expect(getCoingeckoPlatform('8453')).toBe('base')
    expect(getCoingeckoPlatform('137')).toBe('polygon-pos')
    // Lens has no hand-written entry, but the generated list covers it, so it no longer 404s
    expect(getCoingeckoPlatform('232')).toBe('lens')
    expect(getNativeCoinId('lens')).toBe('gho')
  })

  it('passes through slugs CoinGecko publishes as platforms', () => {
    expect(getCoingeckoPlatform('polygon-pos')).toBe('polygon-pos')
    expect(getCoingeckoPlatform('solana')).toBe('solana')
    // CoinGecko publishes no 'bitcoin' asset platform, but we address that chain by coin id
    expect(getCoingeckoPlatform('bitcoin')).toBe('bitcoin')
  })

  // Falling through to the raw input sent the chain id itself to CoinGecko as a platform, a guaranteed 404
  it.each(['123456', 'mainnet', 'not-a-chain'])('returns undefined for unmapped %s', (chainIdOrSlug) => {
    expect(getCoingeckoPlatform(chainIdOrSlug)).toBeUndefined()
  })
})

describe('getNativeCoinId', () => {
  /**
   * The bug this guards against: a platform id is not a coin id, and for these three chains an
   * unrelated token owns the platform id as its coin id. Asking `/simple/price?ids=base` returns
   * the "Base" token rather than the ETH that Base settles in.
   */
  it.each([
    ['base', 'ethereum'],
    ['linea', 'ethereum'],
    ['ink', 'ethereum'],
    ['arbitrum-one', 'ethereum'],
    ['optimistic-ethereum', 'ethereum'],
  ])('resolves %s to the native coin id %s, not the platform id', (platform, coinId) => {
    expect(getNativeCoinId(platform)).toBe(coinId)
    expect(getNativeCoinId(platform)).not.toBe(platform)
  })

  it.each([
    ['ethereum', 'ethereum'],
    ['xdai', 'xdai'],
    ['binance-smart-chain', 'binancecoin'],
    ['polygon-pos', 'polygon-ecosystem-token'],
    ['avalanche', 'avalanche-2'],
    ['plasma', 'plasma'],
    ['solana', 'solana'],
    ['bitcoin', 'bitcoin'],
  ])('resolves %s to %s', (platform, coinId) => {
    expect(getNativeCoinId(platform)).toBe(coinId)
  })

  it('returns undefined for an unknown platform', () => {
    expect(getNativeCoinId('not-a-platform')).toBeUndefined()
  })
})

describe('generated asset platform coverage', () => {
  /**
   * Catches "added a chain but forgot to run `yarn gen:coingecko-platforms`" in CI, without any
   * network access: it only reads the committed generated file.
   */
  it.each(AllChainIds)('chain %s resolves to a platform and a native coin id', (chainId) => {
    const platform = getCoingeckoPlatform(chainId.toString())

    // Sepolia is the one deliberate gap: CoinGecko publishes no platform for it
    if (platform === undefined) {
      expect(chainId).toBe(SupportedChainId.SEPOLIA)
      return
    }

    expect(KNOWN_COINGECKO_PLATFORMS.has(platform)).toBe(true)
    expect(getNativeCoinId(platform)).toBeDefined()
  })

  it('resolves every platform slug back to its chain id', () => {
    for (const chainId of AllChainIds) {
      const platform = getCoingeckoPlatform(chainId.toString())
      if (platform === undefined) continue

      expect(getSupportedCoingeckoChainId(platform)).toBe(chainId)
    }
  })
})

describe('getAddressOrPlatform', () => {
  it('uses the platform lookup for the EVM native-currency placeholder', () => {
    expect(getAddressOrPlatform(EVM_NATIVE_CURRENCY_ADDRESS, 'ethereum')).toBe('ethereum')
  })
})
