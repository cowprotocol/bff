import { OrderParameters, SupportedChainId } from '@cowprotocol/cow-sdk';
import { ethers } from 'ethers';
import { FastifyInstance } from 'fastify';
import {
  ComposableCoW__factory,
  ConditionalOrderCreatedEvent,
} from '@cow-web-services/abis';
import fp from 'fastify-plugin';
import { getConditionalOrderId } from '../utils/getConditionalOrderId';
import { getOrderStatus } from '../utils/getOrderStatus';
import { parseOrderStruct } from '../utils/parseOrderStruct';
import { generateOrderParts } from '../utils/generateOrderParts';
import { Wallet } from '../data/wallet';
import { Order } from '../data/order';
import { OrderPart } from '../data/orderPart';
import { Block } from '../data/block';

// Add lag per network (in confirmations)
const NETWORKS = ['mainnet', 'goerli'];
const CONFIRMATIONS: Record<SupportedChainId, number> = {
  [SupportedChainId.MAINNET]: 5,
  [SupportedChainId.GOERLI]: 3,
  [SupportedChainId.GNOSIS_CHAIN]: 3,
};

export const COMPOSABLE_COW_ADDRESS =
  '0xF487887DA5a4b4e3eC114FDAd97dc0F785d72738';

export interface TwapPartOrderItem {
  uid: string;
  index: number;
  chainId: SupportedChainId;
  safeAddress: string;
  twapOrderId: string;
  order: OrderParameters;
}

type SafeTransactionParams = {
  submissionDate: string;
  executionDate: string | null;
  isExecuted: boolean;
  nonce: number;
  confirmationsRequired: number;
  confirmations: number;
  safeTxHash: string;
};

interface ConditionalOrderParams {
  staticInput: string;
  salt: string;
  handler: string;
}

export interface TwapOrdersSafeData {
  conditionalOrderParams: ConditionalOrderParams;
  safeTxParams: SafeTransactionParams;
}

function infuraPlugin(
  fastify: FastifyInstance,
  options: Record<string, unknown>,
  done: () => void
) {
  const providers = NETWORKS.map(
    (network) => new ethers.providers.InfuraProvider(network)
  );

  fastify.ready((err) => {
    if (err) {
      console.error('Could not start infura plugin: ', err);
    }

    providers.forEach(async (provider) => {
      let isColdStart = true;
      const network = await provider.getNetwork();
      const contract = ComposableCoW__factory.connect(
        COMPOSABLE_COW_ADDRESS,
        provider
      );
      async function getSingleOrder(event: ConditionalOrderCreatedEvent) {
        return await contract.singleOrders(
          event.args.owner,
          await contract.hash(event.args.params)
        );
      }

      const filter = contract.filters.ConditionalOrderCreated();
      async function processConditionalOrders() {
        const blockRepository = fastify.orm.getRepository(Block);
        const lastProcessedBlock = (
          await blockRepository.find({
            where: {
              chainId: network.chainId,
            },
            order: {
              blockNumber: 'DESC',
            },
            take: 1,
          })
        )[0];
        // We process last block again on purpose, on cold start.
        // This way, we can handle any half - processed blocks.
        // However, this means there will always be _at least_ 1 event processed.
        const fromBlockNumber = lastProcessedBlock
          ? lastProcessedBlock.blockNumber + (isColdStart ? 0 : 1)
          : undefined;
        isColdStart = false;
        const lastBlockNumber = await provider.getBlockNumber();
        const confirmationsRequired = CONFIRMATIONS[network.chainId];
        const toBlockNumber = lastBlockNumber - confirmationsRequired;
        console.log(
          `[${network.name}] fetching ConditionalOrderCreated from ${fromBlockNumber} to ${toBlockNumber}`
        );
        const events = await contract.queryFilter(
          filter,
          fromBlockNumber,
          toBlockNumber
        );
        console.log(`[${network.name}] has ${events.length} events`);
        const orderbook = fastify.orderbook[network.chainId];
        const orderRepository = fastify.orm.getRepository(Order);
        const walletRepository = fastify.orm.getRepository(Wallet);

        for (const event of events) {
          try {
            const { params, owner } = event.args;
            const orderId = getConditionalOrderId(params);
            const singleOrder = await getSingleOrder(event);
            const orderStruct = parseOrderStruct(params.staticInput);
            const block = await event.getBlock();
            const blockTimestamp = new Date(block.timestamp * 1000);

            const orderParts = await generateOrderParts(
              orderId,
              orderStruct,
              blockTimestamp,
              network.chainId,
              owner
            );
            const partIds = orderParts.map((part) => part.uid);

            const { executedBuyAmount, executedFeeAmount, executedSellAmount } =
              await orderbook.getExecutionInfo(orderId, partIds);

            const status = getOrderStatus(
              executedSellAmount,
              orderStruct,
              blockTimestamp,
              singleOrder
            );

            let order = await orderRepository.findOne({
              where: {
                id: orderId,
              },
            });

            let wallet = await walletRepository.findOne({
              where: {
                address: owner,
              },
            });

            if (order === null) {
              fastify.orm.manager.transaction(async (manager) => {
                const block = manager.create(Block, {
                  blockNumber: event.blockNumber,
                  chainId: network.chainId,
                });

                await manager.save(block);

                if (wallet === null) {
                  wallet = manager.create(Wallet, {
                    address: owner,
                  });

                  await manager.save(wallet);
                }

                order = new Order();

                const parts = partIds.map((partId) => {
                  const orderPart = new OrderPart();
                  orderPart.id = partId;
                  orderPart.order = order;

                  return orderPart;
                });

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
                order.parts = parts;

                await manager.upsert(Order, order, {
                  conflictPaths: ['id'],
                  upsertType: 'on-duplicate-key-update',
                });
              });
            }
          } catch (err) {
            console.log(
              `Skipping:\n\tOwner: ${
                event.args.owner
              }\n\tOrder ID: ${getConditionalOrderId(
                event.args.params
              )}\n\tTx Hash: ${event.transactionHash}\n\tError: ${err.message}`
            );
          }
        }
      }

      processConditionalOrders();
    });
  });

  done();
}

export default fp(async function (fastify: FastifyInstance) {
  fastify.register(infuraPlugin);
});
