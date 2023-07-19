import {
  ComposableCoW,
  ConditionalOrderCreatedEvent,
} from '@cow-web-services/abis';

/**
 * Gets the value of singleOrders mapping from ComposableCoW.
 * Mainly used to determine if an order is Cancelled.
 *
 * @param contract ComposableCoW contract instance
 * @param event ConditionalOrderCreated event
 * @returns A Promise of the value of singleOrders mapping. If true, it means the order is cancelled.
 */
export async function getSingleOrder(
  contract: ComposableCoW,
  event: ConditionalOrderCreatedEvent
) {
  return await contract.singleOrders(
    event.args.owner,
    await contract.hash(event.args.params)
  );
}
