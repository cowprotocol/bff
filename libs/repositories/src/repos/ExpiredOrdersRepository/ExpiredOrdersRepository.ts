import type { SupportedChainId } from '@cowprotocol/cow-sdk';

export interface ExpiredOrdersContext {
  chainId: SupportedChainId;
  accounts: string[];
  nowTimestamp: number;
  lastCheckTimestamp: number;
}

export interface ExpiredOrder<T = Buffer> {
  uid: T;
  owner: T;
  valid_to: number;
  sell_token: T;
  buy_token: T;
  sell_amount: string;
  buy_amount: string;
  kind: 'sell' | 'buy';
}

export interface ParsedExpiredOrder {
  uid: string;
  owner: string;
  validTo: number;
  sellTokenAddress: string;
  buyTokenAddress: string;
  sellAmount: string;
  buyAmount: string;
  kind: 'sell' | 'buy';
}

export interface ExpiredOrdersRepository {
  fetchExpiredOrdersForAccounts(context: ExpiredOrdersContext): Promise<ParsedExpiredOrder[]>;
}
