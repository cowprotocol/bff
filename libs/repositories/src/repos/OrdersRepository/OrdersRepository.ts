import { Order, SupportedChainId } from '@cowprotocol/cow-sdk'

export type NotificationOrder = Pick<
  Order,
  'uid' | 'partiallyFillable' | 'kind' | 'sellAmount' | 'buyAmount' | 'executedSellAmount' | 'executedBuyAmount'
>

export interface OrdersRepository {
  getOrders(chainId: SupportedChainId, uids: string[]): Promise<Map<string, NotificationOrder>>
}
