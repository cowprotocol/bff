import { Order, SupportedChainId } from '@cowprotocol/cow-sdk';

export interface OrdersRepository {
  getOrders(
    chainId: SupportedChainId,
    uids: string[]
  ): Promise<Map<string, Partial<Order>>>;
}
