import { OrderParameters, SupportedChainId } from '@cowprotocol/cow-sdk';

export enum OrderStatus {
  WaitSigning = 'WaitSigning',
  Pending = 'Pending',
  Scheduled = 'Scheduled',
  Cancelled = 'Cancelled',
  Cancelling = 'Cancelling',
  Expired = 'Expired',
  Fulfilled = 'Fulfilled',
}
export const AllOrderStatuses = [
  OrderStatus.WaitSigning,
  OrderStatus.Pending,
  OrderStatus.Scheduled,
  OrderStatus.Cancelled,
  OrderStatus.Cancelling,
  OrderStatus.Expired,
  OrderStatus.Fulfilled,
] as const; // Important, to force inlining.

export interface OrderStruct {
  sellToken: string;
  buyToken: string;
  receiver: string;
  partSellAmount: string;
  minPartLimit: string;
  // timeStart
  t0: number;
  // numOfParts
  n: number;
  // timeInterval
  t: number;
  span: number;
  appData: string;
}

export interface OrderPart {
  uid: string;
  index: number;
  chainId: SupportedChainId;
  safeAddress: string;
  orderId: string;
  order: OrderParameters;
}

export interface ExecutionInfo {
  executedSellAmount: bigint;
  executedBuyAmount: bigint;
}

export function returnNever(): never {
  throw new Error('This should never happen.');
}
