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
import { fetchTokenHistory } from '../../../../../utils/alchemy';
import { get24HourRange } from '../../../../../utils/date';
import { Big, RoundingMode } from 'bigdecimal.js';
import { getEstimatedFillPrices } from '../getEstimatedFillPrices';
import { ValuePoint } from '../types';
import { fetchGasPriceFromPrometheus } from '../../gas/gasPrice';
import {
  Erc20Repository,
  erc20RepositorySymbol,
} from '@cowprotocol/repositories';

const CACHE_SECONDS = 120;
const ETH_DECIMALS = 18;

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
    additionalProperties: false,
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
      const authToken = process.env.ALCHEMY_API_KEY as string;
      const { start, end } = get24HourRange(new Date());
      const startTime = new Date(start * 1000);
      const endTime = new Date(end * 1000);
      const weth_address = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
      const ethPriceUsd = await await fetchTokenHistory(
        weth_address,
        startTime,
        endTime,
        authToken,
        chainId
      );

      //  Get Token prices in USD
      const sellTokenUsd = await await fetchTokenHistory(
        order.sellToken,
        startTime,
        endTime,
        authToken,
        chainId
      );

      const sellTokenPriceInEth: ValuePoint[] = [];
      if (ethPriceUsd && sellTokenUsd) {
        // TODO: use a wiser approach here
        const length = Math.min(sellTokenUsd.length, ethPriceUsd.length);
        for (let i = 0; i < length; i++) {
          const sellTokenPrice = new Big(sellTokenUsd[i].value.toString());
          const ethPrice = new Big(ethPriceUsd[i].value.toString());
          const value = sellTokenPrice.divide(
            ethPrice,
            20,
            RoundingMode.HALF_UP
          );
          sellTokenPriceInEth.push({
            value: value.toString(),
            time: new Date(sellTokenUsd[i].timestamp).getTime(),
          });
        }
      }

      const erc20Repository: Erc20Repository = apiContainer.get(
        erc20RepositorySymbol
      );

      const sellToken = await erc20Repository.get(chainId, order.sellToken);
      // const buyToken = await erc20Repository.get(chainId, order.buyToken);

      const sellTokenDecimals = sellToken?.decimals || 18;
      // const buyTokenDecimals = buyToken?.decimals || 18;
      const tokenDecimalDifference = sellTokenDecimals - ETH_DECIMALS;

      const sellTokenPriceInWei = sellTokenPriceInEth.map(({ time, value }) => {
        const newValue = new Big(value)
          .divide(10 ** tokenDecimalDifference)
          .toString();
        return {
          time,
          value: newValue,
        };
      });

      if (!sellToken) {
        throw new Error('Sell token not found');
      }

      const gasPrices = await fetchGasPriceFromPrometheus();
      if (!gasPrices) {
        throw new Error('Gas prices not found');
      }

      const estimatedFillPrice = await getEstimatedFillPrices({
        chainId,
        sellToken: order.sellToken,
        buyToken: order.buyToken,
        orderGas: gasAmountString,
        gasPricesGwei: gasPrices,
        sellTokenPriceInEthWei: sellTokenPriceInWei,
        limitPrice: {
          sellAmount: order.sellAmount,
          buyAmount: order.buyAmount,
        },
      });

      reply.header(
        CACHE_CONTROL_HEADER,
        getCacheControlHeaderValue(CACHE_SECONDS)
      );

      reply.send(estimatedFillPrice);
    }
  );
};

export default root;
