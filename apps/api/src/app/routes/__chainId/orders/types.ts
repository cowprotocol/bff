export interface OrderEvent {
  time: number;
  value: OrderStatus;
}

export enum OrderStatus {
  CREATED = 'created',
  READY = 'ready',
  FILTERED = 'filtered',
  INVALID = 'invalid',
}

export interface ValuePoint {
  time: number;
  value: string;
}
