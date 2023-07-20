import { providers } from 'ethers';
import fp from 'fastify-plugin';
import { getConditionalOrderId } from '../conditionalOrder/getConditionalOrderId';
import { getOrderStatus } from '../conditionalOrder/getOrderStatus';
import { parseOrderStruct } from '../conditionalOrder/parseOrderStruct';
import { generateOrderParts } from '../conditionalOrder/generateOrderParts';
import { Wallet } from '../data/wallet';
import { Order } from '../data/order';
import { OrderPart } from '../data/orderPart';
import { Block } from '../data/block';
import { getSingleOrder } from '../conditionalOrder/getSingleOrder';
import { FastifyInstance } from 'fastify';
import { ComposableCoW__factory } from '@cow-web-services/abis';
import { getConditionalOrderCreatedEvents } from '../conditionalOrder/getConditionalOrderCreatedEvents';
export const COMPOSABLE_COW_ADDRESS =
  '0xF487887DA5a4b4e3eC114FDAd97dc0F785d72738';

export async function processConditionalOrders(
  fastify: FastifyInstance,
  provider: providers.InfuraProvider,
  network: providers.Network
) {
  const contract = ComposableCoW__factory.connect(
    COMPOSABLE_COW_ADDRESS,
    provider
  );
  const blockInfo = await fastify.blockInfo(provider, network.chainId);
  const events = await getConditionalOrderCreatedEvents(
    blockInfo,
    contract,
    network.name
  );
  const orderbook = fastify.orderbook[network.chainId];
  const walletRepository = fastify.orm.getRepository(Wallet);

  // Process each ConditionalOrderCreated event, one by one.
  for (const event of events) {
    try {
      const { params, owner } = event.args;
      const orderId = getConditionalOrderId(params);
      const singleOrder = await getSingleOrder(contract, event);
      const orderStruct = parseOrderStruct(params.staticInput);
      const block = await event.getBlock();
      const blockTimestamp = new Date(block.timestamp * 1000);

      // We generate order parts, which are individual orders that make up a TWAP order.
      const orderParts = await generateOrderParts(
        orderId,
        orderStruct,
        blockTimestamp,
        network.chainId,
        owner
      );
      const partIds = orderParts.map((part) => part.uid);

      // Current execution info (how much is filled etc.) for the TWAP order.
      const { executedBuyAmount, executedSellAmount } =
        await orderbook.getExecutionInfo(orderId, partIds);

      const status = getOrderStatus(
        executedSellAmount,
        orderStruct,
        blockTimestamp,
        singleOrder
      );

      // Create a transaction, to ensure we don't have any half processed events.
      fastify.orm.manager.transaction(async (manager) => {
        // Save block to be able to pick up from here on next run.
        const block = manager.create(Block, {
          blockNumber: event.blockNumber,
          chainId: network.chainId,
        });

        await manager.save(block);

        // Wallet is Safe address that owns the TWAP order.
        let wallet = await walletRepository.findOne({
          where: {
            address: owner,
          },
        });

        if (wallet === null) {
          wallet = manager.create(Wallet, {
            address: owner,
          });

          await manager.save(wallet);
        }

        const order = new Order();

        order.id = orderId;
        order.sellToken = orderStruct.sellToken;
        order.buyToken = orderStruct.buyToken;
        order.appData = orderStruct.appData;
        order.receiver = orderStruct.receiver;
        order.chainId = network.chainId;
        order.partSellAmount = orderStruct.partSellAmount;
        order.minPartLimit = orderStruct.minPartLimit;
        order.t0 = orderStruct.t0;
        order.n = orderStruct.n;
        order.t = orderStruct.t;
        order.span = orderStruct.span;
        order.status = status;
        order.wallet = wallet;
        order.executedBuyAmount = executedBuyAmount;
        order.executedSellAmount = executedSellAmount;

        // Order parts are the individual orders that make up the TWAP order.
        const parts = partIds.map((partId) => {
          const orderPart = new OrderPart();
          orderPart.id = partId;
          orderPart.order = order;

          return orderPart;
        });

        order.parts = parts;

        // Save order and parts (update if it exists)
        await manager.upsert(Order, order, {
          conflictPaths: ['id'],
          upsertType: 'on-duplicate-key-update',
        });

        await manager.save(parts);
      });
    } catch (err) {
      // An error has happened, skip event and log it.
      const orderId = getConditionalOrderId(event.args.params);
      console.log(`Skipped: ${orderId}`);
      console.log(`\tTx Hash: ${event.transactionHash}`);
      console.log(`\tError: ${err.message}`);
    }
  }
}

export default fp(async function (fastify: FastifyInstance) {
  fastify.decorate(
    'processConditionalOrders',
    async function (
      provider: providers.InfuraProvider,
      network: providers.Network
    ) {
      return processConditionalOrders(fastify, provider, network);
    }
  );
});

declare module 'fastify' {
  interface FastifyInstance {
    processConditionalOrders: (
      provider: providers.InfuraProvider,
      network: providers.Network
    ) => Promise<void>;
  }
}
