import { BTC_CURRENCY_ADDRESS, isSolanaChain, isSupportedChain } from '@cowprotocol/cow-sdk'
import { logger } from '@cowprotocol/shared'
import { base58 } from '@scure/base'
import { injectable } from 'inversify'
import { isAddress } from 'viem'
import { getSupportedCoingeckoChainId } from '../../utils/coingeckoUtils'
import { Erc20Repository } from '../Erc20Repository/Erc20Repository'
import { PricePoint, PriceStrategy, UsdRepository } from './UsdRepository'

function isValidTokenAddress(tokenAddress: string | undefined): boolean {
  if (
    tokenAddress === undefined ||
    isAddress(tokenAddress, { strict: false }) ||
    tokenAddress === BTC_CURRENCY_ADDRESS
  ) {
    return true
  }

  try {
    return base58.decode(tokenAddress).length === 32
  } catch {
    return false
  }
}

@injectable()
export class UsdRepositoryFallback implements UsdRepository {
  name = 'Fallback'

  constructor(private usdRepositories: UsdRepository[], private erc20Repository: Erc20Repository) {}

  async getUsdPrice(chainIdOrSlug: string, tokenAddress?: string): Promise<number | null> {
    if (!isValidTokenAddress(tokenAddress)) {
      return null
    }

    if (!(await this.tokenExists(chainIdOrSlug, tokenAddress))) {
      return null
    }

    for (let i = 0; i < this.usdRepositories.length; i++) {
      const usdRepository = this.usdRepositories[i]
      const price = await usdRepository.getUsdPrice(chainIdOrSlug, tokenAddress)
      if (price !== null) {
        return price
      }

      if (i < this.usdRepositories.length - 1) {
        const nextRepository = this.usdRepositories[i + 1]
        logger.info(
          `UsdRepositoryFallback: ${usdRepository.name} returned null for ${chainIdOrSlug}/${tokenAddress}, falling back to ${nextRepository.name}`
        )
      }
    }
    return null
  }

  async getUsdPrices(
    chainIdOrSlug: string,
    tokenAddress: string | undefined,
    priceStrategy: PriceStrategy
  ): Promise<PricePoint[] | null> {
    if (!isValidTokenAddress(tokenAddress)) {
      return null
    }

    if (!(await this.tokenExists(chainIdOrSlug, tokenAddress))) {
      return null
    }

    for (let i = 0; i < this.usdRepositories.length; i++) {
      const usdRepository = this.usdRepositories[i]
      const prices = await usdRepository.getUsdPrices(chainIdOrSlug, tokenAddress, priceStrategy)
      if (prices !== null) {
        return prices
      }

      if (i < this.usdRepositories.length - 1) {
        const nextRepository = this.usdRepositories[i + 1]
        logger.info(
          `UsdRepositoryFallback: ${usdRepository.name} returned null for ${chainIdOrSlug}/${tokenAddress}, falling back to ${nextRepository.name}`
        )
      }
    }
    return null
  }

  /**
   * An address with no ERC20 contract on the requested chain can't be priced by any source, so we
   * skip both upstream calls instead of paying for them before returning null anyway.
   * This is most of the wrong-chain traffic we serve (tokens requested on a chain they don't exist on).
   */
  private async tokenExists(chainIdOrSlug: string, tokenAddress: string | undefined): Promise<boolean> {
    if (!tokenAddress) {
      return true
    }

    const chainId = getSupportedCoingeckoChainId(chainIdOrSlug)

    // Erc20Repository only has RPC clients for EVM chains with CoW Protocol settlement, so there is
    // nothing to check against for Solana, Bitcoin or Optimism. Same guard as UsdRepositoryCow.
    if (!chainId || !isSupportedChain(chainId) || isSolanaChain(chainId)) {
      return true
    }

    // In case a Solana address reaches this step, filter it out keeping only EVM addresses
    // Solana chain token queries will skip this step entirely so an EVM chain shouldn't check a Solana token
    if (!isAddress(tokenAddress, { strict: false })) {
      return false
    }

    try {
      const erc20 = await this.erc20Repository.get(chainId, tokenAddress)

      if (erc20 === null) {
        logger.info(`UsdRepositoryFallback: ${tokenAddress} is not an ERC20 on ${chainIdOrSlug}, skipping price lookup`)
        return false
      }

      return true
    } catch (error) {
      // Fail open: an RPC outage must not take down pricing for tokens the price sources can serve
      logger.warn(
        `UsdRepositoryFallback: existence check failed for ${chainIdOrSlug}/${tokenAddress}, continuing: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
      return true
    }
  }
}
