import { injectable } from 'inversify';
import { TokenBalanceParams, TokenBalancesRepository, TokenBalancesResponse } from './TokenBalancesRepository';
import { ALCHEMY_API_KEY, ALCHEMY_CLIENT_NETWORK_MAPPING, getAlchemyApiUrl } from '../../datasources/alchemy';
import { NATIVE_CURRENCY_ADDRESS, ZERO_ADDRESS } from '@cowprotocol/cow-sdk';

const ZERO_ALCHEMY_BALANCE =
  '0x0000000000000000000000000000000000000000000000000000000000000000';
const JSON_RPC_VERSION = '2.0';
const JSON_RPC_REQUEST_ID = 1;
const REQUEST_TIMEOUT_MS = 10_000;
const TOKEN_SPEC = ['erc20', 'NATIVE_TOKEN'] as const;

type AlchemyTokenBalance = {
  contractAddress: string | null;
  tokenBalance: string;
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
    response.jsonrpc !== JSON_RPC_VERSION ||
    typeof response.id !== 'number' ||
    !response.result ||
    typeof response.result !== 'object'
  ) {
    return false;
  }

  return Array.isArray(response.result.tokenBalances);
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

      // Handle native token (contractAddress is null or zero address)
      if (!tokenBalance.contractAddress) {
        console.log('Native token balance: ', tokenBalance.tokenBalance, '');
      }
      const contractAddress =
        // alchemy return null for native token
        tokenBalance.contractAddress === 'null' ||
        tokenBalance.contractAddress === null ||
        tokenBalance.contractAddress === ZERO_ADDRESS
          ? NATIVE_CURRENCY_ADDRESS.toLowerCase()
          : tokenBalance.contractAddress.toLowerCase();

      // Convert hex balance to decimal string
      // Alchemy returns hex string
      const balanceHex = tokenBalance.tokenBalance;
      if (
        balanceHex &&
        balanceHex !== '0x' &&
        balanceHex !== '0x0' &&
        // it's always return ZERO_ALCHEMY_BALANCE for native token
        balanceHex !== ZERO_ALCHEMY_BALANCE
      ) {
        try {
          const balanceBigInt = BigInt(balanceHex);
          acc[contractAddress] = balanceBigInt.toString();
        } catch (error) {
          // todo add logging here
          // If conversion fails, skip this token
          return acc;
        }
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
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const apiUrl = getAlchemyApiUrl(network, ALCHEMY_API_KEY);

    const requestBody = {
      jsonrpc: JSON_RPC_VERSION,
      method: 'alchemy_getTokenBalances',
      params: [address, TOKEN_SPEC],
      id: JSON_RPC_REQUEST_ID,
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
