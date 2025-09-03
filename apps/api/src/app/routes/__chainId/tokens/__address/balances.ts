import { AddressSchema, SupportedChainIdSchema } from '../../../../schemas';
import { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { FastifyPluginAsync } from 'fastify';
import { apiContainer } from '../../../../inversify.config';
import {
  TokenBalancesService,
  tokenBalancesServiceSymbol,
} from '@cowprotocol/services';

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
      examples: ['Price not found'],
    },
  },
} as const satisfies JSONSchema;

type RouteSchema = FromSchema<typeof paramsSchema>;
type SuccessSchema = FromSchema<typeof successSchema>;
type ErrorSchema = FromSchema<typeof errorSchema>;

const tokenBalancesService: TokenBalancesService = apiContainer.get(
  tokenBalancesServiceSymbol
);

const root: FastifyPluginAsync = async (fastify): Promise<void> => {
  // example: http://localhost:3010/1/tokens/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/balances
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
          '404': errorSchema,
        },
      },
    },
    async function (request, reply) {
      const { chainId, address } = request.params;

      const balances = await tokenBalancesService.getTokenBalances({
        address,
        chainId,
      });
      if (balances) {
        reply.send({ balances });
      } else {
        reply.code(400).send({ message: 'Balances not found' });
      }
    }
  );
};

export default root;
