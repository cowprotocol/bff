import { ExpiredOrder, ParsedExpiredOrder } from './ExpiredOrdersRepository';
import { bytesToHexString } from '../../utils/bytesUtils';

export function parseExpiredOrder(order: ExpiredOrder): ParsedExpiredOrder {
  return {
    uid: bytesToHexString(order.uid),
    validTo: order.valid_to,
    owner: bytesToHexString(order.owner),
    sellTokenAddress: bytesToHexString(order.sell_token),
    sellAmount: (order.sell_amount),
    buyTokenAddress: bytesToHexString(order.buy_token),
    buyAmount: (order.buy_amount),
  }
}