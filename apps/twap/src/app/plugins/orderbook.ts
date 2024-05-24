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
              executedSellAmount: BigInt(json.executedSellAmountBeforeFees),
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
          };
        },
        {
          ...DEFAULT_TWAP_EXECUTION_INFO,
        }
      );
    } catch (err) {
      return DEFAULT_TWAP_EXECUTION_INFO;
    }
  };
}

function orderbookFactory(
  dataSource: DataSource,
  apiBaseUrl: string
): Orderbook {
  return {
    settlement: dataSource.getRepository(Settlement),
    trade: dataSource.getRepository(Trade),
    order: dataSource.getRepository(Order),
    getExecutionInfo: getExecutionInfoFactory(dataSource, apiBaseUrl),
  };
}

export default fp(async function (fastify: FastifyInstance) {
  fastify.ready(() => {
    // const gnosis = orderbookFactory(
    //   fastify.orm['gnosis'],
    //   getApiBaseUrl(SupportedChainId.GNOSIS_CHAIN)
    // );
    const mainnet = orderbookFactory(
      fastify.orm['mainnet'],
      getApiBaseUrl(SupportedChainId.MAINNET)
    );
    // const sepolia = orderbookFactory(
    //   fastify.orm['sepolia'],
    //   getApiBaseUrl(SupportedChainId.SEPOLIA)
    // );
    fastify.decorate('orderbook', {
      // gnosis,
      mainnet,
      // sepolia,
      [SupportedChainId.MAINNET]: mainnet,
      // [SupportedChainId.SEPOLIA]: sepolia,
      // [SupportedChainId.GNOSIS_CHAIN]: gnosis,
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
      gnosis: Orderbook;
      mainnet: Orderbook;
      sepolia: Orderbook;
      [SupportedChainId.SEPOLIA]: Orderbook;
      [SupportedChainId.GNOSIS_CHAIN]: Orderbook;
      [SupportedChainId.MAINNET]: Orderbook;
    };
  }
}
