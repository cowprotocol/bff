import { SlippageService, slippageServiceSymbol } from '@cowprotocol/services';

import { ChainIdSchema, OrderIdSchema } from '../../../../schemas';
import { FastifyPluginAsync } from 'fastify';
import { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { apiContainer } from '../../../../inversify.config';
import {
  CACHE_CONTROL_HEADER,
  getCacheControlHeaderValue,
} from '../../../../../utils/cache';
import { UsdRepositoryCoingecko } from '@cowprotocol/repositories';
import { OrderBookApi } from '@cowprotocol/cow-sdk';
import { Big, MathContext, RoundingMode } from 'bigdecimal.js';

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
      const now = Math.round(Date.now() / 1000);
      const startTimestamp = now - 24 * 60 * 60;
      const orderBookApi = new OrderBookApi({chainId, env:'prod'})
      const order = await orderBookApi.getOrder(orderId as string);
      const usdRepository = new UsdRepositoryCoingecko();

      const sellTokenHistory = await usdRepository.getUsdPricesBetween(chainId, order.sellToken, startTimestamp, now);
      const buyTokenHistory = await usdRepository.getUsdPricesBetween(chainId, order.buyToken, startTimestamp, now);
      const dataPoints = [];
      if (sellTokenHistory && buyTokenHistory) {
        // TODO: use a wiser approach here
        const length = Math.min(sellTokenHistory.length, buyTokenHistory.length);
        for (let i = 0; i < length; i++) {
          const sellTokenPrice = new Big(sellTokenHistory[i].price.toString());
          const buyTokenPrice = new Big(buyTokenHistory[i].price.toString());
          const marketPrice = buyTokenPrice.divide(sellTokenPrice, 20, RoundingMode.HALF_UP);
          dataPoints.push({
            value: marketPrice.toString(),
            time: sellTokenHistory[i].date.getTime()
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
