import type { OrderKind, SupportedChainId } from '@cowprotocol/cow-sdk'

export const ORDER_EXPIRATION_THRESHOLD_SECONDS = 60

export interface ExpiredOrdersContext {
  chainId: SupportedChainId
  accounts: string[]
  nowTimestamp: number
  lastCheckTimestamp: number
}

export interface ExpiredOrder<T = Buffer> {
  uid: T
  owner: T
  receiver: T | null
  valid_to: number
  sell_token: T
  buy_token: T
  sell_amount: string
  buy_amount: string
  kind: OrderKind
}

export interface ParsedExpiredOrder {
  uid: string
  owner: string
  receiver: string | null
  validTo: number
  sellTokenAddress: string
  buyTokenAddress: string
  sellAmount: string
  buyAmount: string
  kind: OrderKind
}

export interface ExpiredOrdersRepository {
  fetchExpiredOrdersForAccounts(context: ExpiredOrdersContext): Promise<ParsedExpiredOrder[]>
}
