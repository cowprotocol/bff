import { SlippageService, slippageServiceSymbol } from '@cowprotocol/services';

import { ChainIdSchema, OrderIdSchema } from '../../../../schemas';
import { FastifyPluginAsync } from 'fastify';
import { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { apiContainer } from '../../../../inversify.config';
import {
  CACHE_CONTROL_HEADER,
  getCacheControlHeaderValue,
} from '../../../../../utils/cache';
import { OrderBookApi } from '@cowprotocol/cow-sdk';

const CACHE_SECONDS = 120;

const routeSchema = {
  type: 'object',
  required: ['chainId'],
  additionalProperties: false,
  properties: {
    chainId: ChainIdSchema,
  },
} as const satisfies JSONSchema;

const gasCostQueryStringSchema = {
  type: 'object',
  properties: {
    orderId: OrderIdSchema,
  },
} as const satisfies JSONSchema;

const gasCostSuccessSchema = {
  type: 'array',
  items: {
    type: 'object',
    required: ['time', 'value'],
    properties: {
      time: {
        type: 'number',
        description: 'Unix timestamp in seconds',
      },
      value: {
        type: 'string',
        description: 'Gas cost expressed in sell token decimals',
      },
    },
  },
} as const satisfies JSONSchema;

type RouteSchema = FromSchema<typeof routeSchema>;

const root: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get<{
    Params: RouteSchema;
    Querystring: FromSchema<typeof gasCostQueryStringSchema>;
    Reply: FromSchema<typeof gasCostSuccessSchema>;
  }>(
    '/estimatedFillPrice',
    {
      schema: {
        description: 'Retrieve 24h gas cost time series in 5-minute intervals',
        tags: ['orders'],
        params: routeSchema,
        querystring: gasCostQueryStringSchema,
        response: {
          '2XX': gasCostSuccessSchema,
        },
      },
    },
    async function (request, reply) {
      const { chainId } = request.params;
      const orderId = request.query.orderId as string;
      fastify.log.info(
        `Get gas cost time series for chain ${chainId} in sell token`
      );

      // TODO: Implement the actual gas cost fetching logic

      //  Get order details from orderbook
      const orderBookApi = new OrderBookApi({ chainId, env: 'prod' });
      const order = await orderBookApi.getOrder(orderId as string);

      console.log({ order });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gasAmountString = (order as any).quote?.gasAmount as
        | string
        | undefined;

      if (!gasAmountString) {
        throw new Error(
          'Gas amount not found. Required for estimated fill price calculation.'
        );
      }

      //  Get gas prices from prometheus
      //  Get Ethereum prices in USD (coingecko)
      //  Get Token prices in USD

      const now = Math.floor(Date.now() / 1000);
      const fiveMinutes = 5 * 60;
      const dataPoints = Array.from({ length: 288 }, (_, i) => ({
        time: now - (287 - i) * fiveMinutes,
        value: (BigInt(Math.floor(Math.random() * 1e15)) * 100n).toString(),
      }));

      reply.header(
        CACHE_CONTROL_HEADER,
        getCacheControlHeaderValue(CACHE_SECONDS)
      );

      reply.send(dataPoints);
    }
  );
};

export default root;
