import 'reflect-metadata';

import { injectable } from 'inversify';
import { PricePoint, PriceStrategy, UsdRepository } from './UsdRepository';
import { COINGECKO_PLATFORMS, coingeckoProClient } from '../coingecko';

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
    chainId: number,
    tokenAddress: string
  ): Promise<number | null> {
    const platform = COINGECKO_PLATFORMS[chainId];
    if (!platform) {
      return null;
    }

    const tokenAddressLower = tokenAddress.toLowerCase();

    // Get prices: See https://docs.coingecko.com/reference/contract-address-market-chart
    // Get prices. See https://docs.coingecko.com/reference/coins-id-market-chart
    const fetchResponse = await coingeckoProClient.GET(
      `/simple/token_price/{id}`,
      {
        params: {
          path: {
            id: platform,
          },
          query: {
            contract_addresses: tokenAddressLower,
            vs_currencies: 'usd',
          },
        },
      }
    );

    if (fetchResponse.error) {
      throw fetchResponse.error;
    }
    const priceData = fetchResponse.data;

    if (!priceData[tokenAddressLower] || !priceData[tokenAddressLower].usd) {
      return null;
    }

    return priceData[tokenAddressLower].usd;
  }

  async getUsdPrices(
    chainId: number,
    tokenAddress: string,
    priceStrategy: PriceStrategy
  ): Promise<PricePoint[] | null> {
    const platform = COINGECKO_PLATFORMS[chainId];
    if (!platform) {
      return null;
    }

    const tokenAddressLower = tokenAddress.toLowerCase();
    const days = DAYS_PER_PRICE_STRATEGY[priceStrategy].toString();

    // Get prices: See https://docs.coingecko.com/reference/contract-address-market-chart
    const fetchResponses = await coingeckoProClient.GET(
      `/coins/{id}/contract/{contract_address}/market_chart`,
      {
        params: {
          path: {
            id: platform,
            contract_address: tokenAddressLower,
          },
          query: {
            vs_currency: 'usd',
            days,
            interval: priceStrategy === 'daily' ? 'daily' : undefined, // Coingecko will auto-choose the granularity based on the number of days (but days, its required in our case). However, is not good to specify it for the other because it will throw an error (saying that the PRO account is not enough)
          },
        },
      }
    );

    if (!fetchResponses.data) {
      return null;
    }

    const volumesMap =
      fetchResponses.data.total_volumes?.reduce((acc, [timestamp, volume]) => {
        acc.set(timestamp, volume);
        return acc;
      }, new Map<number, number>()) || undefined;

    const prices = fetchResponses.data.prices;
    const pricePoints = prices.map(([timestamp, price]) => ({
      date: new Date(timestamp),
      price,
      volume: volumesMap?.get(timestamp) ?? 0,
    }));

    return pricePoints;
  }
}
