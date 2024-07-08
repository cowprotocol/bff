import {
  ChainIdSchema,
  ETHEREUM_ADDRESS_PATTERN,
} from '../../../../../schemas';
import { FastifyPluginAsync } from 'fastify';
import { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { getSlippageService } from '@cowprotocol/services';

// TODO:  Add this in a follow up PR
// import { ALL_SUPPORTED_CHAIN_IDS } from '@cowprotocol/cow-sdk';

interface Result {
  slippageBps: number;
}

const routeSchema = {
  type: 'object',
  required: ['chainId', 'baseTokenAddress', 'quoteTokenAddress'],
  properties: {
    chainId: ChainIdSchema,
    baseTokenAddress: {
      title: 'Base token address',
      description: 'Currency that is being bought or sold.',
      type: 'string',
      pattern: ETHEREUM_ADDRESS_PATTERN,
    },
    quoteTokenAddress: {
      title: 'Quote token address',
      description: ' Currency in which the price of the base token is quoted.',
      type: 'string',
      pattern: ETHEREUM_ADDRESS_PATTERN,
    },
  },
} as const satisfies JSONSchema;

const responseSchema = {
  type: 'object',
  required: ['slippageBps'],
  properties: {
    slippageBps: {
      title: 'Slippage tolerance in basis points',
      description:
        'Slippage tolerance in basis points. One basis point is equivalent to 0.01% (1/100th of a percent)',
      type: 'number',
      examples: [50, 100, 200], // [ALL_SUPPORTED_CHAIN_IDS],
      minimum: 0,
      maximum: 10000,
    },
  },
} as const satisfies JSONSchema;

type RouteSchema = FromSchema<typeof routeSchema>;

const slippageService = getSlippageService();

const root: FastifyPluginAsync = async (fastify): Promise<void> => {
  // example: http://localhost:3010/chains/1/markets/0x6b175474e89094c44da98b954eedeac495271d0f-0x2260fac5e5542a773aa44fbcfedf7c193bc2c599/slippageTolerance
  fastify.get<{
    Params: RouteSchema;
    Reply: Result;
  }>(
    '/slippageTolerance',
    {
      schema: {
        params: routeSchema,
        response: {
          '2XX': responseSchema,
        },
      },
    },
    async function (request, reply) {
      const { chainId, baseTokenAddress, quoteTokenAddress } = request.params;
      fastify.log.info(
        `Get default slippage for market ${baseTokenAddress}-${quoteTokenAddress} on chain ${chainId}`
      );
      const slippageBps = slippageService.getSlippageBps(
        baseTokenAddress,
        quoteTokenAddress
      );
      reply.send({ slippageBps });
    }
  );
};

export default root;
