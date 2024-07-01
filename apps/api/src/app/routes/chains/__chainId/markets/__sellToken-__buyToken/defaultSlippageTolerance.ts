import {
  ChainIdSchema,
  ETHEREUM_ADDRESS_PATTERN,
} from '../../../../../schemas';
import { FastifyPluginAsync } from 'fastify';
import { FromSchema, JSONSchema } from 'json-schema-to-ts';

interface Result {
  slippageBps: number;
}

const routeSchema = {
  type: 'object',
  required: ['chainId', 'sellToken', 'buyToken'],
  properties: {
    chainId: ChainIdSchema,
    sellToken: {
      title: 'Sell token address',
      description: 'Sell token address',
      type: 'string',
      pattern: ETHEREUM_ADDRESS_PATTERN,
    },
    buyToken: {
      title: 'Buy token address',
      description: 'Buy token address',
      type: 'string',
      pattern: ETHEREUM_ADDRESS_PATTERN,
    },
  },
} as const satisfies JSONSchema;

type RouteSchema = FromSchema<typeof routeSchema>;

const root: FastifyPluginAsync = async (fastify): Promise<void> => {
  // example: http://localhost:3010/chains/1/markets/0x6b175474e89094c44da98b954eedeac495271d0f-0x2260fac5e5542a773aa44fbcfedf7c193bc2c599/defaultSlippageTolerance
  fastify.get<{
    Params: RouteSchema;
    Reply: Result;
<<<<<<< HEAD
  }>(
    '/defaultSlippageTolerance',
    {
      schema: { params: routeSchema },
    },
    async function (request, reply) {
      const { chainId, sellTokenAddress, buyTokenAddress } = request.params;
      fastify.log.info(
        `Get default slippage for market ${sellTokenAddress}-${buyTokenAddress} on chain ${chainId}`
      );
      reply.send({ slippageBps: 50 });
    }
  );
=======
  }>('/defaultSlippageTolerance', {
    schema: { params: routeSchema }
  }, async function (request, reply) {
    const { chainId, sellTokenAddress, buyTokenAddress } = request.params;
    fastify.log.info(`Get default slippage for market ${sellTokenAddress}-${buyTokenAddress} on chain ${chainId}`);
    reply.send({ slippageBps: 50 })
  });
>>>>>>> ec8f7c4 (Use BPS)
};

export default root;
