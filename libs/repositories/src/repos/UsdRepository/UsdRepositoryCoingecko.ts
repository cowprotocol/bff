import { injectable } from 'inversify';
import {
  getCoingeckoProClient,
  SimplePriceResponse,
} from '../../datasources/coingecko';
import { throwIfUnsuccessful } from '../../utils/throwIfUnsuccessful';
import { PricePoint, PriceStrategy, UsdRepository } from './UsdRepository';
import {
  getAddressOrPlatform,
  getCoingeckoPlatform,
} from '../../utils/coingeckoUtils';

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
};

@injectable()
export class UsdRepositoryCoingecko implements UsdRepository {
  async getUsdPrice(
    chainIdOrSlug: string,
    tokenAddress?: string | undefined
  ): Promise<number | null> {
    const platform = getCoingeckoPlatform(chainIdOrSlug);
    if (!platform) {
      return null;
    }

    const addressOrPlatform = getAddressOrPlatform(tokenAddress, platform);

    const fetchPromise = tokenAddress
      ? this.getSinglePriceByContractAddress(platform, addressOrPlatform)
      : this.getSinglePriceByPlatformId(platform);

    return this.handleSinglePriceResponse(fetchPromise, addressOrPlatform);
  }

  async getUsdPrices(
    chainIdOrSlug: string,
    tokenAddress: string | undefined,
    priceStrategy: PriceStrategy
  ): Promise<PricePoint[] | null> {
    const platform = getCoingeckoPlatform(chainIdOrSlug);
    if (!platform) {
      return null;
    }

    const days = DAYS_PER_PRICE_STRATEGY[priceStrategy].toString();
    const interval = priceStrategy === 'daily' ? 'daily' : undefined;

    const { data, response } = tokenAddress
      ? await this.getMarketDataByTokenAddress(
          platform,
          days,
          interval,
          tokenAddress
        )
      : await this.getMarketDataByPlatformId(platform, days, interval);

    if (response.status === 404 || !data) {
      return null;
    }
    await throwIfUnsuccessful(
      'Error getting USD prices from Coingecko',
      response
    );

    const volumesMap =
      data.total_volumes?.reduce((acc, [timestamp, volume]) => {
        acc.set(timestamp, volume);
        return acc;
      }, new Map<number, number>()) || undefined;

    const prices = data.prices;
    if (!prices) {
      return null;
    }

    const pricePoints = prices.map(([timestamp, price]) => ({
      date: new Date(timestamp),
      price,
      volume: volumesMap?.get(timestamp) ?? 0,
    }));

    return pricePoints;
  }

  private async getSinglePriceByContractAddress(
    platform: string,
    tokenAddress: string
  ) {
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
    });
  }

  private async getSinglePriceByPlatformId(platform: string) {
    // https://docs.coingecko.com/reference/simple-price
    return getCoingeckoProClient().GET(`/simple/price`, {
      params: {
        query: {
          ids: platform,
          vs_currencies: 'usd',
        },
      },
    });
  }

  private async handleSinglePriceResponse(
    fetchPromise: Promise<unknown>,
    key: string
  ): Promise<number | null> {
    const { data, response } = (await fetchPromise) as {
      data: SimplePriceResponse;
      response: Response;
    };

    if (response.status === 404 || !data?.[key]?.usd) {
      return null;
    }

    await throwIfUnsuccessful(
      'Error getting USD price from Coingecko',
      response
    );

    return data[key].usd;
  }

  private async getMarketDataByTokenAddress(
    platform: string,
    days: string,
    interval: 'daily' | undefined,
    tokenAddress: string
  ) {
    const address = tokenAddress.toLowerCase();
    // Get prices: See https://docs.coingecko.com/reference/contract-address-market-chart
    return getCoingeckoProClient().GET(
      `/coins/{id}/contract/{contract_address}/market_chart`,
      {
        params: {
          path: {
            id: platform,
            contract_address: address,
          },
          query: {
            vs_currency: 'usd',
            days,
            interval, // Coingecko will auto-choose the granularity based on the number of days (but days, its required in our case). However, is not good to specify it for the other because it will throw an error (saying that the PRO account is not enough)
          },
        },
      }
    );
  }

  private async getMarketDataByPlatformId(
    platform: string,
    days: string,
    interval: 'daily' | undefined
  ) {
    // Get prices: See https://docs.coingecko.com/reference/contract-address-market-chart
    return getCoingeckoProClient().GET(`/coins/{id}/market_chart`, {
      params: {
        path: {
          id: platform,
        },
        query: {
          vs_currency: 'usd',
          days,
          interval, // Coingecko will auto-choose the granularity based on the number of days (but days, its required in our case). However, is not good to specify it for the other because it will throw an error (saying that the PRO account is not enough)
        },
      },
    });
  }
}
