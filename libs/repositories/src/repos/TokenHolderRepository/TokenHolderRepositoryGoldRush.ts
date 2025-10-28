import { SupportedChainId } from '@cowprotocol/cow-sdk';
import { injectable } from 'inversify';
import {
  GOLD_RUSH_API_BASE_URL,
  GOLD_RUSH_API_KEY,
  GOLD_RUSH_CLIENT_NETWORK_MAPPING,
} from '../../datasources/goldRush';
import {
  TokenHolderPoint,
  TokenHolderRepository,
} from './TokenHolderRepository';

interface GoldRushTokenHolderItem {
  contract_decimals: number;
  contract_name: string;
  contract_ticker_symbol: string;
  contract_address: string;
  supports_erc: string[];
  logo_url: string;
  address: string;
  balance: string;
  total_supply: string;
  block_height: number;
}

interface GoldRushTokenHoldersResponse {
  data: {
    updated_at: string;
    chain_id: number;
    chain_name: string;
    items: GoldRushTokenHolderItem[];
    pagination: {
      has_more: boolean;
      page_number: number;
      page_size: number;
      total_count: number;
    };
  };
  error: boolean;
  error_message: null | string;
  error_code: null | number;
}

@injectable()
export class TokenHolderRepositoryGoldRush implements TokenHolderRepository {
  async getTopTokenHolders(
    chainId: SupportedChainId,
    tokenAddress: string
  ): Promise<TokenHolderPoint[] | null> {
    const network = GOLD_RUSH_CLIENT_NETWORK_MAPPING[chainId];
    if (!network) {
      return null;
    }

    const response = (await fetch(
      `${GOLD_RUSH_API_BASE_URL}/v1/${network}/tokens/${tokenAddress}/token_holders_v2/`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${GOLD_RUSH_API_KEY}` },
      }
    ).then((res) => res.json())) as GoldRushTokenHoldersResponse;

    if (response.error) {
      return null;
    }

    return response.data.items.map((item) => ({
      address: item.address,
      balance: item.balance,
    }));
  }
}
