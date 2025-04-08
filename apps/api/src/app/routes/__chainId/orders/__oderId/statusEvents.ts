import { SlippageService, slippageServiceSymbol } from '@cowprotocol/services';

import { ChainIdSchema, OrderIdSchema } from '../../../../schemas';
import { FastifyPluginAsync } from 'fastify';
import { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { apiContainer } from '../../../../inversify.config';
import {
  CACHE_CONTROL_HEADER,
  getCacheControlHeaderValue,
} from '../../../../../utils/cache';
import { OrderStatus } from '@cowprotocol/cow-sdk';
import { getOrderEvents } from '../getOrderEvents';

const CACHE_SECONDS = 120;

const routeSchema = {
  type: 'object',
  required: ['chainId' /*'orderId'*/],
  additionalProperties: false,
  properties: {
    chainId: ChainIdSchema,
    // orderId: OrderIdSchema,
  },
} as const satisfies JSONSchema;

const gasQueryStringSchema = {
  type: 'object',
  required: ['orderId'],
  properties: {
    orderId: OrderIdSchema,
  },
} as const satisfies JSONSchema;

const gasSuccessSchema = {
  type: 'array',
  items: {
    type: 'object',
    required: ['time', 'value'],
    additionalProperties: false,
    properties: {
      time: {
        type: 'number',
        description: 'Unix timestamp in seconds',
      },
      value: {
        type: 'string',
        enum: [
          'created',
          'ready',
          'filtered',
          'invalid',
          'executing',
          'considered',
          'traded',
          'cancelled',
        ],
        description: 'Order status event',
      },
    },
  },
} as const satisfies JSONSchema;

type RouteSchema = FromSchema<typeof routeSchema>;

const root: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get<{
    Params: RouteSchema;
    Querystring: FromSchema<typeof gasQueryStringSchema>;
    Reply: FromSchema<typeof gasSuccessSchema>;
  }>(
    '/statusEvents',
    {
      schema: {
        description: 'Retrieve 24h gas cost time series in 5-minute intervals',
        tags: ['orders'],
        params: routeSchema,
        querystring: gasQueryStringSchema,
        response: {
          '2XX': gasSuccessSchema,
        },
      },
    },
    async function (request, reply) {
      const { chainId } = request.params;
      fastify.log.info(
        `Get gas cost time series for chain ${chainId} in sell token`
      );

      const { orderId } = request.query;

      // TODO: Implement the actual order status events
      const events = await getOrderEvents(chainId, orderId);

      reply.header(
        CACHE_CONTROL_HEADER,
        getCacheControlHeaderValue(CACHE_SECONDS)
      );

      reply.send(events);
    }
  );
};

export default root;
