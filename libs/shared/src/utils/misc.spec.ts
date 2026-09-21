import { SupportedChainId } from '@cowprotocol/cow-sdk'
import { toTokenAddress } from './misc'

describe('toTokenAddress', () => {
  it('checksums an EVM address', () => {
    const result = toTokenAddress('0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', SupportedChainId.MAINNET)

    expect(result).toBe('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2')
  })

  it('converts the EVM native currency placeholder into the wrapped token address', () => {
    const result = toTokenAddress('0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', SupportedChainId.MAINNET)

    expect(result).toBe('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2')
  })

  it('returns a Solana address unchanged, preserving case', () => {
    const solanaAddress = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'

    const result = toTokenAddress(solanaAddress, SupportedChainId.SOLANA)

    expect(result).toBe(solanaAddress)
  })

  it('converts the Solana native currency placeholder into the wrapped SOL address', () => {
    const result = toTokenAddress('11111111111111111111111111111111', SupportedChainId.SOLANA)

    expect(result).toBe('So11111111111111111111111111111111111111112')
  })
})
