import {
  ComposableCoW,
  ConditionalOrderCreatedEvent,
} from '@cow-web-services/abis';
import { BlockInfo } from '../types/order';

/**
 * Returns ConditionalOrderCreated events between fromBlockNumber and toBlockNumber.
 *
 * @param blockInfo BlockInfo containing fromBlockNumber and toBlockNumber. Used to limit which blocks to look at.
 * @param contract CompodableCoW contract instance.
 * @param identifier Identifier for logs, usually network.name. If not present, defaults to 'Unknown'.
 * @returns
 */
export async function getConditionalOrderCreatedEvents(
  { fromBlockNumber, toBlockNumber }: BlockInfo,
  contract: ComposableCoW,
  identifier = 'Unknown'
): Promise<ConditionalOrderCreatedEvent[]> {
  // We are only interested in ConditionalOrderCreated events,
  // Since we are trying to determine TWAP order creation.
  const filter = contract.filters.ConditionalOrderCreated();

  console.log(
    `[${identifier}] fetching ConditionalOrderCreated from ${fromBlockNumber} to ${toBlockNumber}`
  );

  // ConditionalOrderCreated between fromBlockNumber and toBlockNumber
  const events = await contract.queryFilter(
    filter,
    fromBlockNumber,
    toBlockNumber
  );
  console.log(`[${identifier}] has ${events.length} events`);

  return events;
}
