import type { SupportedChainId } from '@cowprotocol/cow-sdk';

export interface OnChainPlacedOrdersRepository {
  getAccountsForOrders(chainId: SupportedChainId, uids: string[]): Promise<{[account: string]: string[]}>;
}
