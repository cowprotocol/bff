import type { Order } from '@cowprotocol/contracts';
import {
  OrderParameters,
  OrderSigningUtils,
  SupportedChainId,
} from '@cowprotocol/cow-sdk';
import { returnNever } from '../types/order';

function isOrder(order: Order | OrderParameters): order is Order {
  return true;
}

export async function computeOrderUid(
  chainId: SupportedChainId,
  owner: string,
  order: Order | OrderParameters
): Promise<string> {
  const { computeOrderUid: _computeOrderUid } = await import(
    '@cowprotocol/contracts'
  );
  const domain = await OrderSigningUtils.getDomain(chainId);

  if (isOrder(order)) {
    return _computeOrderUid(domain, order, owner);
  }

  return returnNever();
}
