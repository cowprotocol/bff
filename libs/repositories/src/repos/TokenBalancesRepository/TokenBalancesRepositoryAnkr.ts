import { injectable } from 'inversify';
import { TokenBalanceParams, TokenBalancesRepository, TokenBalancesResponse } from './TokenBalancesRepository';
import { ANKR_API_KEY, ANKR_CLIENT_NETWORK_MAPPING, getAnkrApiUrl } from '../../datasources/ankr';
import { NATIVE_CURRENCY_ADDRESS } from '@cowprotocol/cow-sdk';
import { logger } from '@cowprotocol/shared';

const JSON_RPC_VERSION = '2.0';
const JSON_RPC_REQUEST_ID = 1;
const REQUEST_TIMEOUT_MS = 10_000;

type AnkrAsset = {
  blockchain: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimals: number;
  tokenType: string; // 'NATIVE' or 'ERC20'
  contractAddress?: string;
  holderAddress: string;
  balance: string;
  balanceRawInteger: string;
  balanceUsd: string;
  tokenPrice: string;
  thumbnail: string;
};

type AnkrGetAccountBalanceResponse = {
  jsonrpc: string;
  id: number;
  result: {
    totalBalanceUsd: string;
    assets: AnkrAsset[];
    nextPageToken?: string;
  };
};

function isAnkrGetAccountBalanceResponse(
  data: unknown
): data is AnkrGetAccountBalanceResponse {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const response = data as AnkrGetAccountBalanceResponse;

  if (
    response.jsonrpc !== JSON_RPC_VERSION ||
    typeof response.id !== 'number' ||
    !response.result ||
    typeof response.result !== 'object'
  ) {
    return false;
  }

  return Array.isArray(response.result.assets);
}

@injectable()
export class TokenBalancesRepositoryAnkr implements TokenBalancesRepository {
  async getTokenBalances({
    address,
    chainId,
  }: TokenBalanceParams): Promise<TokenBalancesResponse> {
    const blockchain = ANKR_CLIENT_NETWORK_MAPPING[chainId];
    if (!blockchain) {
      throw new Error('Unsupported chain');
    }

    const response = await this.requestBalanceData(address, blockchain);

    if (!response.ok) {
      throw new Error(
        `Ankr API error: ${response.status} ${response.statusText}`
      );
    }

    const asJson = await response.json();
    if (!isAnkrGetAccountBalanceResponse(asJson)) {
      throw new Error('Invalid Ankr response');
    }

    return asJson.result.assets.reduce((acc, asset) => {
      // Handle native token
      const contractAddress =
        asset.tokenType === 'NATIVE' || !asset.contractAddress
          ? NATIVE_CURRENCY_ADDRESS.toLowerCase()
          : asset.contractAddress.toLowerCase();

      // Ankr returns balance as decimal string in balanceRawInteger
      const balance = asset.balanceRawInteger;
      if (balance && balance !== '0') {
        try {
          const balanceBigInt = BigInt(balance);
          if (balanceBigInt !== 0n) {
            acc[contractAddress] = balanceBigInt.toString();
          }
        } catch (error) {
          logger.error(
            error,
            `[TokenBalancesRepositoryAnkr] Error processing balance for token ${contractAddress} on chain ${chainId}. Value is ${balance}.`
          );
          return acc;
        }
      }

      return acc;
    }, {} as Record<string, string>);
  }

  private async requestBalanceData(
    address: string,
    blockchain: string
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const apiUrl = getAnkrApiUrl(ANKR_API_KEY);

    const requestBody = {
      jsonrpc: JSON_RPC_VERSION,
      method: 'ankr_getAccountBalance',
      params: {
        walletAddress: address,
        blockchain: [blockchain],
        onlyWhitelisted: false,
      },
      id: JSON_RPC_REQUEST_ID,
    };

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

