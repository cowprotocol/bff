import {
  TokenDetailService,
  tokenDetailServiceSymbol,
} from '@cowprotocol/services';
import { FastifyPluginAsync } from 'fastify';
import { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { apiContainer } from '../../../../inversify.config';
import { AddressSchema, SupportedChainIdSchema } from '../../../../schemas';

const paramsSchema = {
  type: 'object',
  required: ['chainId', 'tokenAddress'],
  additionalProperties: false,
  properties: {
    chainId: SupportedChainIdSchema,
    tokenAddress: AddressSchema,
  },
} as const satisfies JSONSchema;

const successSchema = {
  type: 'object',
  required: ['address'],
  additionalProperties: false,
  properties: {
    address: {
      title: 'Address',
      description: 'Token contract address.',
      type: 'string',
    },
    name: {
      title: 'Name',
      description: 'Token name.',
      type: 'string',
    },
    symbol: {
      title: 'Symbol',
      description: 'Token symbol.',
      type: 'string',
    },
    decimals: {
      title: 'Decimals',
      description: 'Token decimals.',
      type: 'integer',
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
    },
  },
} as const satisfies JSONSchema;

type ParamsSchema = FromSchema<typeof paramsSchema>;
type SuccessSchema = FromSchema<typeof successSchema>;
type ErrorSchema = FromSchema<typeof errorSchema>;

const tokenDetailService: TokenDetailService = apiContainer.get(
  tokenDetailServiceSymbol
);

const root: FastifyPluginAsync = async (fastify): Promise<void> => {
  // example: http://localhost:3010/1/tokens/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/details
  fastify.get<{
    Params: ParamsSchema;
    Reply: SuccessSchema | ErrorSchema;
  }>(
    '/details',
    {
      schema: {
        description: 'Get details (name, symbol, decimals) for a token',
        tags: ['tokens'],
        params: paramsSchema,
        response: {
          '2XX': successSchema,
          '404': errorSchema,
        },
      },
    },
    async function (request, reply) {
      const { chainId, tokenAddress } = request.params;

      const token = await tokenDetailService.getTokenDetails(
        chainId,
        tokenAddress
      );

      if (token === null) {
        reply.code(404).send({ message: 'Token not found' });
        return;
      }

      reply.send(token);
    }
  );
};

export default root;
