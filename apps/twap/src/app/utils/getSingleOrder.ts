import {
  ComposableCoW,
  ConditionalOrderCreatedEvent,
} from '@cow-web-services/abis';

// Gets the value of singleOrders mapping from ComposableCoW
// Mainly used to determine if an order is Cancelled.
export async function getSingleOrder(
  contract: ComposableCoW,
  event: ConditionalOrderCreatedEvent
) {
  return await contract.singleOrders(
    event.args.owner,
    await contract.hash(event.args.params)
  );
}
