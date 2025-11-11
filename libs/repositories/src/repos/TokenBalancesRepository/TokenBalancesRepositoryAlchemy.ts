import { injectable } from 'inversify';
import { TokenBalanceParams, TokenBalancesRepository, TokenBalancesResponse } from './TokenBalancesRepository';
import { ALCHEMY_API_KEY, ALCHEMY_CLIENT_NETWORK_MAPPING, getAlchemyApiUrl } from '../../datasources/alchemy';

type AlchemyTokenBalance = {
  contractAddress: string;
  tokenBalance: string; // hex string
  error?: string;
};

type AlchemyGetTokenBalancesResponse = {
  jsonrpc: string;
  id: number;
  result: {
    address: string;
    tokenBalances: AlchemyTokenBalance[];
    pageKey?: string;
  };
};

function isAlchemyGetTokenBalancesResponse(
  data: unknown
): data is AlchemyGetTokenBalancesResponse {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const response = data as AlchemyGetTokenBalancesResponse;

  if (
    response.jsonrpc !== '2.0' ||
    typeof response.id !== 'number' ||
    !response.result ||
    typeof response.result !== 'object'
  ) {
    return false;
  }

  if (!Array.isArray(response.result.tokenBalances)) {
    return false;
  }

  return true;
}

@injectable()
export class TokenBalancesRepositoryAlchemy implements TokenBalancesRepository {
  async getTokenBalances({
    address,
    chainId,
  }: TokenBalanceParams): Promise<TokenBalancesResponse> {
    const network = ALCHEMY_CLIENT_NETWORK_MAPPING[chainId];
    if (!network) {
      throw new Error('Unsupported chain');
    }

    const response = await this.requestBalanceData(address, network);

    if (!response.ok) {
      throw new Error(
        `Alchemy API error: ${response.status} ${response.statusText}`
      );
    }

    const asJson = await response.json();
    if (!isAlchemyGetTokenBalancesResponse(asJson)) {
      throw new Error('Invalid Alchemy response');
    }

    return asJson.result.tokenBalances.reduce((acc, tokenBalance) => {
      if (tokenBalance.error) {
        return acc;
      }

      const contractAddress = tokenBalance.contractAddress.toLowerCase();
      // Convert hex balance to decimal string
      // Alchemy returns hex string
      const balanceHex = tokenBalance.tokenBalance;
      if (balanceHex && balanceHex !== '0x' && balanceHex !== '0x0') {
        try {
          const balanceBigInt = BigInt(balanceHex);
          acc[contractAddress] = balanceBigInt.toString();
        } catch (error) {
          // If conversion fails, skip this token
          // todo add logging here
          return acc;
        }
      } else {
        acc[contractAddress] = '0';
      }

      return acc;
    }, {} as Record<string, string>);
  }

  private async requestBalanceData(
    address: string,
    network: string
  ): Promise<Response> {
    if (!ALCHEMY_API_KEY) {
      throw new Error('ALCHEMY_API_KEY is not set');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    const apiUrl = getAlchemyApiUrl(network, ALCHEMY_API_KEY);

    const requestBody = {
      jsonrpc: '2.0',
      method: 'alchemy_getTokenBalances',
      params: [address, 'erc20'],
      id: 1,
    };

    try {
      return fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
