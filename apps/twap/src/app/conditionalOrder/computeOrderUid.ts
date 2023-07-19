import type { Order } from '@cowprotocol/contracts';
import { computeOrderUid as _computeOrderUid } from '@cowprotocol/contracts';
import {
  OrderParameters,
  OrderSigningUtils,
  SupportedChainId,
} from '@cowprotocol/cow-sdk';
import { returnNever } from '../types/order';
import { TypedDataDomain } from 'ethers';

function isOrder(order: Order | OrderParameters): order is Order {
  return true;
}

const domainCache: Partial<Record<SupportedChainId, TypedDataDomain>> = {};
async function getDomain(chainId: SupportedChainId): Promise<TypedDataDomain> {
  if (domainCache[chainId]) {
    return domainCache[chainId];
  }

  const domain = await OrderSigningUtils.getDomain(chainId);
  domainCache[chainId] = domain;

  return domain;
}

// TODO: This should be pulled from the SDK, in the future.
/**
 * Computes the order UID for a given order.
 *
 * @param chainId Which chain the order is at. Must be a SupportedChainId.
 * @param owner Address of the Safe Wallet that owns the order.
 * @param order Order or OrderParameters to compute the UID for.
 * @returns A Promise that returns the order UID.
 */
export async function computeOrderUid(
  chainId: SupportedChainId,
  owner: string,
  order: Order | OrderParameters
): Promise<string> {
  const domain = await getDomain(chainId);

  if (isOrder(order)) {
    return _computeOrderUid(domain, order, owner);
  }

  return returnNever();
}
