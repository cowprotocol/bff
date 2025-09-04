import { injectable } from 'inversify';
import {
  TokenBalanceParams,
  TokenBalancesRepository,
  TokenBalancesResponse,
} from './TokenBalancesRepository';
import {
  MORALIS_API_BASE_URL,
  MORALIS_API_KEY,
  MORALIS_CLIENT_NETWORK_MAPPING,
} from '../../datasources/moralis';

type MoralisBalanceTokenResponse = {
  token_address: string;
  symbol: string;
  name: string;
  logo: string;
  thumbnail: string;
  decimals: number;
  balance: string;
  possible_spam: boolean;
  verified_contract: boolean;
  total_supply: string;
  total_supply_formatted: string;
  percentage_relative_to_total_supply: number;
  security_score: number;
};

type MoralisBalanceResponse = {
  result: MoralisBalanceTokenResponse[];
};

function isMoralisBalanceResponse(
  data: unknown
): data is MoralisBalanceResponse {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const response = data as any;

  if (!Array.isArray(response.result)) {
    return false;
  }

  return response.result;
}

@injectable()
export class TokenBalancesRepositoryMoralis implements TokenBalancesRepository {
  async getTokenBalances({
    address,
    chainId,
  }: TokenBalanceParams): Promise<TokenBalancesResponse> {
    const network = MORALIS_CLIENT_NETWORK_MAPPING[chainId];
    if (!network) {
      throw new Error('Unsupported chain');
    }

    const response = await this.requestBalanceData(address, network);

    if (!response.ok) {
      throw new Error(
        `Moralis API error: ${response.status} ${response.statusText}`
      );
    }

    const asJson = await response.json();
    if (!isMoralisBalanceResponse(asJson)) {
      throw new Error('Invalid Moralis response');
    }

    return asJson.result.reduce((acc, tokenBalanceItem) => {
      acc[tokenBalanceItem.token_address.toLowerCase()] =
        tokenBalanceItem.balance;
      return acc;
    }, {} as Record<string, string>);
  }

  private async requestBalanceData(
    address: string,
    network: string
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    const url = `${MORALIS_API_BASE_URL}/v2.2/wallets/${address}/tokens?chain=${network}&order=DESC`;
    try {
      return fetch(url, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'X-API-Key': `${MORALIS_API_KEY}`,
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
