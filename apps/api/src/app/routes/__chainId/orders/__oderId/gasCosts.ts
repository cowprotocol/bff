import { SlippageService, slippageServiceSymbol } from '@cowprotocol/services';

import { ChainIdSchema, OrderIdSchema } from '../../../../schemas';
import { FastifyPluginAsync } from 'fastify';
import { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { apiContainer } from '../../../../inversify.config';
import {
  CACHE_CONTROL_HEADER,
  getCacheControlHeaderValue,
} from '../../../../../utils/cache';

const CACHE_SECONDS = 120;

const routeSchema = {
  type: 'object',
  required: ['chainId', 'orderId'],
  additionalProperties: false,
  properties: {
    chainId: ChainIdSchema,
    orderId: OrderIdSchema,
  },
} as const satisfies JSONSchema;

const gasCostQueryStringSchema = {
  type: 'object',
  properties: {},
} as const satisfies JSONSchema;

const gasCostSuccessSchema = {
  type: 'array',
  items: {
    type: 'object',
    required: ['timestamp', 'gasCost'],
    properties: {
      timestamp: {
        type: 'number',
        description: 'Unix timestamp in seconds',
      },
      gasCost: {
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
    '/gasCosts',
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
      fastify.log.info(
        `Get gas cost time series for chain ${chainId} in sell token`
      );

      // TODO: Implement the actual gas cost fetching logic
      //  Get order details from orderbook
      //  Get gas prices from prometheus
      //  Get Ethereum prices in USD (coingecko)
      //  Get Token prices in USD

      const now = Math.floor(Date.now() / 1000);
      const fiveMinutes = 5 * 60;
      const dataPoints = Array.from({ length: 288 }, (_, i) => ({
        timestamp: now - (287 - i) * fiveMinutes,
        gasCost: (BigInt(Math.floor(Math.random() * 1e15)) * 100n).toString(),
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
