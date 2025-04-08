import { SlippageService, slippageServiceSymbol } from '@cowprotocol/services';

import { ChainIdSchema, OrderIdSchema } from '../../../../schemas';
import { FastifyPluginAsync } from 'fastify';
import { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { apiContainer } from '../../../../inversify.config';
import {
  CACHE_CONTROL_HEADER,
  getCacheControlHeaderValue,
} from '../../../../../utils/cache';
import { OrderBookApi, SupportedChainId } from '@cowprotocol/cow-sdk';
import { Big, RoundingMode } from 'bigdecimal.js';
import { get24HourRange, getLast24HourRange } from '../../../../../utils/date';
import * as process from 'node:process';

import { fetchTokenHistory } from '../../../../../utils/alchemy';

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
    '/marketPrice',
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
      const { start, end } = getLast24HourRange();
      const startTime = new Date(start * 1000);
      const endTime = new Date(end * 1000);
      const orderBookApi = new OrderBookApi({chainId, env:'prod'})
      const order = await orderBookApi.getOrder(orderId as string);

      const authToken = process.env.ALCHEMY_API_KEY as string;
      const sellTokenHistory = await fetchTokenHistory(order.sellToken, startTime, endTime, authToken, chainId);
      const buyTokenHistory = await fetchTokenHistory(order.buyToken, startTime, endTime, authToken, chainId);
      const dataPoints = [];
      if (sellTokenHistory && buyTokenHistory) {
        // TODO: use a wiser approach here
        const length = Math.min(sellTokenHistory.length, buyTokenHistory.length);
        for (let i = 0; i < length; i++) {
          const sellTokenPrice = new Big(sellTokenHistory[i].value.toString());
          const buyTokenPrice = new Big(buyTokenHistory[i].value.toString());
          const marketPrice = buyTokenPrice.divide(sellTokenPrice, 20, RoundingMode.HALF_UP);
          dataPoints.push({
            value: marketPrice.toString(),
            time: new Date(sellTokenHistory[i].timestamp).getTime()
          });
        }
      }

      reply.header(
        CACHE_CONTROL_HEADER,
        getCacheControlHeaderValue(CACHE_SECONDS)
      );

      reply.send(dataPoints);
    }
  );
};

export default root;
