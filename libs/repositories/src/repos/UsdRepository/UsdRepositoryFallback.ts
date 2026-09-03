import { BTC_CURRENCY_ADDRESS, isNonEvmChain, isSupportedChain } from '@cowprotocol/cow-sdk'
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

    return this.firstNonNull(
      chainIdOrSlug,
      tokenAddress,
      (usdRepository) => usdRepository.getUsdPrice(chainIdOrSlug, tokenAddress),
      // A null here becomes a 404, which the frontend takes as proof the token has no price
      { rethrowOnFailure: true }
    )
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

    return this.firstNonNull(
      chainIdOrSlug,
      tokenAddress,
      (usdRepository) => usdRepository.getUsdPrices(chainIdOrSlug, tokenAddress, priceStrategy),
      // A null here becomes 0 bps with a 200, not a 404, so there is nothing to protect against
      { rethrowOnFailure: false }
    )
  }

  /**
   * Queries the repositories in order and returns the first non-null result.
   *
   * A repository that throws is treated like one that returned null, so an upstream failure doesn't
   * deny a price the next source can still serve. That is the point of this class, and previously a
   * Coingecko or Redis error escaped as a 500 instead of falling back to Cow.
   *
   * `rethrowOnFailure` decides what happens when nothing produced a price and something failed. It
   * exists to stop a null being mistaken for "this token has no price", which only matters where a
   * null becomes a **404**:
   *
   * - getUsdPrice: a null is a 404, and cowswap records that token in `bffUnknownCurrencies` and stops
   *   asking us for it for the rest of the session. An outage must never look like one, so it rethrows.
   *   See getBffUsdPrice/fetchCurrencyUsdPrice in cowswap.
   * - getUsdPrices: a null is 0 bps with a **200**, which every consumer already reads as "unknown"
   *   and answers with its own default. There is no 404 to avoid, and UsdRepositoryCow does not
   *   implement this method at all, so rethrowing would turn every Coingecko failure into a 500 for
   *   the whole of /slippageTolerance rather than degrading to that default.
   */
  private async firstNonNull<T>(
    chainIdOrSlug: string,
    tokenAddress: string | undefined,
    getResult: (usdRepository: UsdRepository) => Promise<T | null>,
    { rethrowOnFailure }: { rethrowOnFailure: boolean }
  ): Promise<T | null> {
    let failure: unknown

    for (let i = 0; i < this.usdRepositories.length; i++) {
      const usdRepository = this.usdRepositories[i]
      const nextRepository = this.usdRepositories[i + 1]
      const fallingBackTo = nextRepository ? `, falling back to ${nextRepository.name}` : ''

      try {
        const result = await getResult(usdRepository)

        if (result !== null) {
          return result
        }

        // "has no price" rather than "returned null": the source may have declined without calling
        // its upstream at all, e.g. a chain Coingecko does not support. It says which, on its own line.
        if (nextRepository) {
          logger.info(
            `UsdRepositoryFallback: ${usdRepository.name} has no price for ${chainIdOrSlug}/${tokenAddress}${fallingBackTo}`
          )
        }
      } catch (error) {
        failure = error
        logger.warn(
          `UsdRepositoryFallback: ${usdRepository.name} failed for ${chainIdOrSlug}/${tokenAddress}${fallingBackTo}: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      }
    }

    if (failure !== undefined && rethrowOnFailure) {
      throw failure
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
    if (!chainId || !isSupportedChain(chainId) || isNonEvmChain(chainId)) {
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
