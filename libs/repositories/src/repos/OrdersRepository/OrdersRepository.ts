import { Order, SupportedChainId } from '@cowprotocol/cow-sdk'

export type NotificationOrder = Pick<
  Order,
  | 'uid'
  | 'partiallyFillable'
  | 'kind'
  | 'sellAmount'
  | 'buyAmount'
  | 'executedSellAmount'
  | 'executedBuyAmount'
  | 'receiver'
>

export interface OrderExecutionPosition {
  orderUid: string
  blockNumber: bigint
  logIndex: number
}

export function getOrderExecutionPositionKey({ orderUid, blockNumber, logIndex }: OrderExecutionPosition): string {
  return `${orderUid.toLowerCase()}-${blockNumber}-${logIndex}`
}

export interface OrdersRepository {
  getOrders(chainId: SupportedChainId, uids: string[]): Promise<Map<string, NotificationOrder>>
  getOrderExecutionSnapshots(
    chainId: SupportedChainId,
    positions: OrderExecutionPosition[]
  ): Promise<Map<string, NotificationOrder>>
}
