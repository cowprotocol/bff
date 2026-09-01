import { injectable } from 'inversify'
import { getAddressKey } from '@cowprotocol/cow-sdk'
import { getCoingeckoProClient, SimplePriceResponse } from '../../datasources/coingecko'
import { getAddressOrPlatform, getCoingeckoPlatform, getNativeCoinId } from '../../utils/coingeckoUtils'
import { throwIfUnsuccessful } from '../../utils/throwIfUnsuccessful'
import { PricePoint, PriceStrategy, UsdRepository } from './UsdRepository'

/**
 * Number of days of data to fetch for each price strategy
 *
 * Depending on the granularity, we specify the number of days of data to fetch.
 * Coingecko will auto-choose the granularity based on the number of days. Its actually weird, because if you try to
 * specify the granularity it will throw you an error (saying that the PRO account is not enough). So its important to
 * control the granularity by the number of days.
 *
 */
const DAYS_PER_PRICE_STRATEGY: Record<PriceStrategy, number> = {
  '5m': 1, // 1 day (~288 points)
  hourly: 5, // 5 Days of hourly data (~120 points)
  daily: 90, // 90 Days of daily data (~90 points)
}

@injectable()
export class UsdRepositoryCoingecko implements UsdRepository {
  name = 'Coingecko'

  async getUsdPrice(chainIdOrSlug: string, tokenAddress?: string | undefined): Promise<number | null> {
    const platform = getCoingeckoPlatform(chainIdOrSlug)
    if (!platform) {
      return null
    }

    const addressOrPlatform = getAddressOrPlatform(tokenAddress, platform)

    if (addressOrPlatform !== platform) {
      return this.handleSinglePriceResponse(
        this.getSinglePriceByContractAddress(platform, addressOrPlatform),
        addressOrPlatform
      )
    }

    // Native currency. It has no contract, and the platform id is not a coin id, so it has to be
    // resolved to one. Without it we return null and let the Cow price source handle the chain.
    const coinId = getNativeCoinId(platform)
    if (!coinId) {
      return null
    }

    return this.handleSinglePriceResponse(this.getSinglePriceByCoinId(coinId), coinId)
  }

  async getUsdPrices(
    chainIdOrSlug: string,
    tokenAddress: string | undefined,
    priceStrategy: PriceStrategy
  ): Promise<PricePoint[] | null> {
    const platform = getCoingeckoPlatform(chainIdOrSlug)
    if (!platform) {
      return null
    }

    const days = DAYS_PER_PRICE_STRATEGY[priceStrategy].toString()
    const interval = priceStrategy === 'daily' ? 'daily' : undefined

    const addressOrPlatform = getAddressOrPlatform(tokenAddress, platform)

    if (addressOrPlatform !== platform) {
      return this.handleMarketDataResponse(
        this.getMarketDataByTokenAddress(platform, days, interval, addressOrPlatform)
      )
    }

    // Native currency: same coin id resolution as getUsdPrice
    const coinId = getNativeCoinId(platform)
    if (!coinId) {
      return null
    }

    return this.handleMarketDataResponse(this.getMarketDataByCoinId(coinId, days, interval))
  }

  private async handleMarketDataResponse(
    marketDataPromise:
      | ReturnType<UsdRepositoryCoingecko['getMarketDataByTokenAddress']>
      | ReturnType<UsdRepositoryCoingecko['getMarketDataByCoinId']>
  ): Promise<PricePoint[] | null> {
    const { data, response } = await marketDataPromise

    if (response.status === 404 || !data) {
      return null
    }
    await throwIfUnsuccessful('Error getting USD prices from Coingecko', response)

    const volumesMap =
      data.total_volumes?.reduce((acc, [timestamp, volume]) => {
        acc.set(timestamp, volume)
        return acc
      }, new Map<number, number>()) || undefined

    const prices = data.prices
    if (!prices) {
      return null
    }

    return prices.map(([timestamp, price]) => ({
      date: new Date(timestamp),
      price,
      volume: volumesMap?.get(timestamp) ?? 0,
    }))
  }

  private async getSinglePriceByContractAddress(platform: string, tokenAddress: string) {
    // Get USD price: https://docs.coingecko.com/reference/simple-token-price
    return getCoingeckoProClient().GET(`/simple/token_price/{id}`, {
      params: {
        path: {
          id: platform,
        },
        query: {
          contract_addresses: tokenAddress,
          vs_currencies: 'usd',
        },
      },
    })
  }

  private async getSinglePriceByCoinId(coinId: string) {
    // https://docs.coingecko.com/reference/simple-price
    return getCoingeckoProClient().GET(`/simple/price`, {
      params: {
        query: {
          ids: coinId,
          vs_currencies: 'usd',
        },
      },
    })
  }

  private async handleSinglePriceResponse(fetchPromise: Promise<unknown>, key: string): Promise<number | null> {
    const { data, response } = (await fetchPromise) as {
      data: SimplePriceResponse
      response: Response
    }

    if (response.status === 404 || !data?.[key]?.usd) {
      return null
    }

    await throwIfUnsuccessful('Error getting USD price from Coingecko', response)

    return data[key].usd
  }

  private async getMarketDataByTokenAddress(
    platform: string,
    days: string,
    interval: 'daily' | undefined,
    tokenAddress: string
  ) {
    // Get prices: See https://docs.coingecko.com/reference/contract-address-market-chart
    return getCoingeckoProClient().GET(`/coins/{id}/contract/{contract_address}/market_chart`, {
      params: {
        path: {
          id: platform,
          contract_address: getAddressKey(tokenAddress),
        },
        query: {
          vs_currency: 'usd',
          days,
          interval, // Coingecko will auto-choose the granularity based on the number of days (but days, its required in our case). However, is not good to specify it for the other because it will throw an error (saying that the PRO account is not enough)
        },
      },
    })
  }

  private async getMarketDataByCoinId(coinId: string, days: string, interval: 'daily' | undefined) {
    // Get prices: See https://docs.coingecko.com/reference/coins-id-market-chart
    return getCoingeckoProClient().GET(`/coins/{id}/market_chart`, {
      params: {
        path: {
          id: coinId,
        },
        query: {
          vs_currency: 'usd',
          days,
          interval, // Coingecko will auto-choose the granularity based on the number of days (but days, its required in our case). However, is not good to specify it for the other because it will throw an error (saying that the PRO account is not enough)
        },
      },
    })
  }
}
