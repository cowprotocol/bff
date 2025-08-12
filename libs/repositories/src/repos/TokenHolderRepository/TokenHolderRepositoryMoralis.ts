import { SupportedChainId } from '@cowprotocol/cow-sdk';
import { injectable } from 'inversify';
import {
  MORALIS_API_BASE_URL,
  MORALIS_API_KEY,
  MORALIS_CLIENT_NETWORK_MAPPING,
} from '../../datasources/moralis';
import {
  TokenHolderPoint,
  TokenHolderRepository,
} from './TokenHolderRepository';

interface MoralisTokenHolderItem {
  balance: string;
  balance_formated: string;
  is_contract: boolean;
  owner_address: string;
  owner_address_label: string;
  entity: string;
  entity_logo: string;
  usd_value: string;
  percentage_relative_to_total_supply: number;
}

interface MoralisTokenHoldersResponse {
  result: MoralisTokenHolderItem[];
  cursor: string;
  page: number;
  page_size: number;
}

@injectable()
export class TokenHolderRepositoryMoralis implements TokenHolderRepository {
  async getTopTokenHolders(
    chainId: SupportedChainId,
    tokenAddress: string
  ): Promise<TokenHolderPoint[] | null> {
    const network = MORALIS_CLIENT_NETWORK_MAPPING[chainId];
    if (!network) {
      return null;
    }

    const response = (await fetch(
      `${MORALIS_API_BASE_URL}/v2.2/erc20/${tokenAddress}/owners?chain=${network}&order=DESC&limit=2`,
      {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'X-API-Key': `${MORALIS_API_KEY}`,
        },
      }
    ).then((res) => res.json())) as MoralisTokenHoldersResponse;

    if (response.result.length === 0) {
      return null;
    }

    return response.result.map((item) => ({
      address: item.owner_address,
      balance: item.balance,
    }));
  }
}
