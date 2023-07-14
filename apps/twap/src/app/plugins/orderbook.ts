import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

import { Settlement } from '../orderbook/settlement';
import { DataSource, Repository } from 'typeorm';
import { Trade } from '../orderbook/trade';
import { Order } from '../orderbook/order';
import { SupportedChainId } from '@cowprotocol/cow-sdk';
import { getApiBaseUrl } from '../utils/getApiBaseUrl';
import { ExecutionInfo } from '../types/order';

const DEFAULT_TWAP_EXECUTION_INFO = {
  executedSellAmount: BigInt(0),
  executedBuyAmount: BigInt(0),
  executedFeeAmount: BigInt(0),
};

function getExecutionInfoFactory(dataSource: DataSource, apiBaseUrl: string) {
  return async function getExecutionInfo(
    orderId: string,
    partIds: string[]
  ): Promise<ExecutionInfo> {
    // TODO: We need to create a query here to derive the execution info from the
    // read only db.
    // However, because staging db does not have any of the data we need, we can't rely on this.
    // Based on: https://github.com/cowprotocol/services/blob/main/crates/database/src/orders.rs#L483-L549
    // Other options are: Subgraph or watch for the settlement event
    try {
      const orders: ExecutionInfo[] = await Promise.all(
        partIds.map((partId) =>
          fetch(`${apiBaseUrl}/orders/${partId}`)
            .then((res) => res.json())
            .then((json) => ({
              executedBuyAmount: BigInt(json.executedBuyAmount),
              executedSellAmount: BigInt(json.executedSellAmount),
              executedFeeAmount: BigInt(json.executedFeeAmount),
            }))
            .catch(() => DEFAULT_TWAP_EXECUTION_INFO)
        )
      );

      return orders.reduce(
        (accumulator, order) => {
          return {
            executedBuyAmount:
              accumulator.executedBuyAmount + BigInt(order.executedBuyAmount),
            executedSellAmount:
              accumulator.executedSellAmount + BigInt(order.executedSellAmount),
            executedFeeAmount:
              accumulator.executedFeeAmount + BigInt(order.executedFeeAmount),
          };
        },
        {
          executedBuyAmount: BigInt(0),
          executedSellAmount: BigInt(0),
          executedFeeAmount: BigInt(0),
        }
      );
    } catch (err) {
      return DEFAULT_TWAP_EXECUTION_INFO;
    }
  };
}

export default fp(async function (fastify: FastifyInstance) {
  fastify.ready(() => {
    const goerli = {
      settlement: fastify.orm['goerli'].getRepository(Settlement),
      trade: fastify.orm['goerli'].getRepository(Trade),
      order: fastify.orm['goerli'].getRepository(Order),
      getExecutionInfo: getExecutionInfoFactory(
        fastify.orm['goerli'],
        getApiBaseUrl(SupportedChainId.GOERLI)
      ),
    };
    const mainnet = {
      settlement: fastify.orm['mainnet'].getRepository(Settlement),
      trade: fastify.orm['mainnet'].getRepository(Trade),
      order: fastify.orm['mainnet'].getRepository(Order),
      getExecutionInfo: getExecutionInfoFactory(
        fastify.orm['mainnet'],
        getApiBaseUrl(SupportedChainId.MAINNET)
      ),
    };
    fastify.decorate('orderbook', {
      goerli,
      mainnet,
      [SupportedChainId.GOERLI]: goerli,
      [SupportedChainId.MAINNET]: mainnet,
    });
  });
});

interface Orderbook {
  settlement: Repository<Settlement>;
  trade: Repository<Trade>;
  order: Repository<Order>;
  getExecutionInfo: ReturnType<typeof getExecutionInfoFactory>;
}

declare module 'fastify' {
  interface FastifyInstance {
    orderbook: {
      goerli: Orderbook;
      mainnet: Orderbook;
      [SupportedChainId.GOERLI]: Orderbook;
      [SupportedChainId.MAINNET]: Orderbook;
    };
  }
}
