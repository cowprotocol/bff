import { injectable } from 'inversify';
import {
  TokenHolderPoint,
  TokenHolderRepository,
} from './TokenHolderRepository';
import { SupportedChainId } from '@cowprotocol/shared';
import {
  ETHPLORER_API_KEY,
  ETHPLORER_BASE_URL,
} from '../../datasources/ethplorer';

interface EthplorerSuccess {
  holders: {
    address: string;
    balance: number;
    share: number;
    rawBalance: string;
  }[];
}

interface EthplorerError {
  error: {
    message: string;
    code: number;
  };
}

@injectable()
export class TokenHolderRepositoryEthplorer implements TokenHolderRepository {
  async getTopTokenHolders(
    chainId: SupportedChainId,
    tokenAddress: string
  ): Promise<TokenHolderPoint[] | null> {
    const baseAPI = ETHPLORER_BASE_URL[chainId];

    if (!baseAPI) {
      return null;
    }

    const searchParams = new URLSearchParams({
      apiKey: ETHPLORER_API_KEY,
      limit: '100',
    });

    const response = await fetch(
      `${baseAPI}/getTopTokenHolders/${tokenAddress}?${searchParams}`,
      {
        method: 'GET',
      }
    )
      .then((res) => res.json() as Promise<EthplorerSuccess>)
      .catch((e) => e as EthplorerError);

    if ('error' in response || !response.holders.length) {
      return null;
    }

    return response.holders.map((item) => ({
      address: item.address,
      balance: item.rawBalance,
    }));
  }
}
