import {
  TokenDetailService,
  tokenDetailServiceSymbol,
} from '@cowprotocol/services';
import { FastifyPluginAsync } from 'fastify';
import { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { apiContainer } from '../../../inversify.config';
import { SupportedChainIdSchema, ETHEREUM_ADDRESS_PATTERN } from '../../../schemas';

const paramsSchema = {
  type: 'object',
  required: ['chainId'],
  additionalProperties: false,
  properties: {
    chainId: SupportedChainIdSchema,
  },
} as const satisfies JSONSchema;

const bodySchema = {
  type: 'object',
  required: ['tokenAddresses'],
  additionalProperties: false,
  properties: {
    tokenAddresses: {
      title: 'Token Addresses',
      description: 'List of token addresses to get details for.',
      type: 'array',
      items: {
        type: 'string',
        pattern: ETHEREUM_ADDRESS_PATTERN,
      },
      minItems: 1,
      maxItems: 100,
    },
  },
} as const satisfies JSONSchema;

const tokenSchema = {
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
} as const;

const successSchema = {
  type: 'array',
  items: tokenSchema,
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
type BodySchema = FromSchema<typeof bodySchema>;
type SuccessSchema = FromSchema<typeof successSchema>;
type ErrorSchema = FromSchema<typeof errorSchema>;

const tokenDetailService: TokenDetailService = apiContainer.get(
  tokenDetailServiceSymbol
);

const root: FastifyPluginAsync = async (fastify): Promise<void> => {
  // example: POST http://localhost:3010/1/tokens/details { "tokenAddresses": ["0xC02...", "0xA0b..."] }
  fastify.post<{
    Params: ParamsSchema;
    Body: BodySchema;
    Reply: SuccessSchema | ErrorSchema;
  }>(
    '/details',
    {
      schema: {
        description:
          'Get details (name, symbol, decimals) for multiple tokens',
        tags: ['tokens'],
        params: paramsSchema,
        body: bodySchema,
        response: {
          '2XX': successSchema,
          '404': errorSchema,
        },
      },
    },
    async function (request, reply) {
      const { chainId } = request.params;
      const { tokenAddresses } = request.body;

      const tokens = await tokenDetailService.getTokensDetails(
        chainId,
        tokenAddresses
      );

      const result = tokens.filter(
        (token): token is NonNullable<typeof token> => token !== null
      );

      if (result.length === 0) {
        reply.code(404).send({ message: 'No tokens found' });
        return;
      }

      reply.send(result);
    }
  );
};

export default root;
