import { AddressSchema, SupportedChainIdSchema } from '../../../../schemas';
import { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { FastifyPluginAsync } from 'fastify';
import { apiContainer } from '../../../../inversify.config';
import {
  TokenBalancesService,
  tokenBalancesServiceSymbol,
} from '@cowprotocol/services';
import ms from 'ms';
import {
  CACHE_CONTROL_HEADER,
  getCacheControlHeaderValue,
} from '../../../../../utils/cache';

const paramsSchema = {
  type: 'object',
  required: ['chainId', 'address'],
  additionalProperties: false,
  properties: {
    chainId: SupportedChainIdSchema,
    address: AddressSchema,
  },
} as const satisfies JSONSchema;

const successSchema = {
  type: 'object',
  required: ['balances'],
  properties: {
    balances: {
      type: 'object',
      additionalProperties: { type: 'string' },
    },
  },
} as const satisfies JSONSchema;

const errorSchema = {
  type: 'object',
  required: ['message'],
  additionalProperties: false,
  properties: {
    message: {
      title: 'Message',
      description: 'Message describing the error.',
      type: 'string',
      examples: ['Balance not found'],
    },
  },
} as const satisfies JSONSchema;

type RouteSchema = FromSchema<typeof paramsSchema>;
type SuccessSchema = FromSchema<typeof successSchema>;
type ErrorSchema = FromSchema<typeof errorSchema>;

const tokenBalancesService: TokenBalancesService = apiContainer.get(
  tokenBalancesServiceSymbol
);

const CACHE_SECONDS = ms('5s') / 1000;

const root: FastifyPluginAsync = async (fastify): Promise<void> => {
  // example: GET: http://localhost:3010/1/tokens/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/balances
  fastify.get<{
    Params: RouteSchema;
    Reply: SuccessSchema | ErrorSchema;
  }>(
    '/balances',
    {
      schema: {
        description:
          'Get token balances for a given address on a specific chain.',
        tags: ['tokens'],
        params: paramsSchema,
        response: {
          '2XX': successSchema,
          '4XX': errorSchema,
          '5XX': errorSchema,
        },
      },
    },
    async function (request, reply) {
      reply.header(
        CACHE_CONTROL_HEADER,
        getCacheControlHeaderValue(CACHE_SECONDS)
      );

      const { chainId, address } = request.params;

      try {
        const balances = await tokenBalancesService.getTokenBalances({
          address,
          chainId,
        });
        if (balances) {
          reply.send({ balances });
        } else {
          reply.code(404).send({ message: 'Balances not found' });
        }
      } catch (e: unknown) {
        fastify.log.error(
          `Error fetching balances for address ${address} on chain ${chainId}: ${e}`
        );

        const errorMessage =
          e instanceof Error ? e.message : 'Internal Server Error';
        reply.code(500).send({ message: errorMessage });
      }
    }
  );
};

export default root;
