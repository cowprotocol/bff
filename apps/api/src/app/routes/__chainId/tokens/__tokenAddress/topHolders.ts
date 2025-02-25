import {
  TokenHolderService,
  tokenHolderServiceSymbol,
} from '@cowprotocol/services';
import { AddressSchema, ChainIdSchema } from '../../../../schemas';
import { FastifyPluginAsync } from 'fastify';
import { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { apiContainer } from '../../../../inversify.config';

const paramsSchema = {
  type: 'object',
  required: ['chainId', 'tokenAddress'],
  additionalProperties: false,
  properties: {
    chainId: ChainIdSchema,
    tokenAddress: AddressSchema,
  },
} as const satisfies JSONSchema;

const successSchema = {
  type: 'array',
  items: {
    type: 'object',
    required: ['address', 'balance'],
    additionalProperties: false,
    properties: {
      address: {
        title: 'Address',
        description: 'Address of the token holder.',
        type: 'string',
      },
      balance: {
        title: 'Balance',
        description: 'Balance of the token holder.',
        type: 'string',
      },
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

type RouteSchema = FromSchema<typeof paramsSchema>;
type SuccessSchema = FromSchema<typeof successSchema>;
type ErrorSchema = FromSchema<typeof errorSchema>;

const tokenHolderService: TokenHolderService = apiContainer.get(
  tokenHolderServiceSymbol
);

const root: FastifyPluginAsync = async (fastify): Promise<void> => {
  // example: http://localhost:3010/1/tokens/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/topHolders
  fastify.get<{
    Params: RouteSchema;
    Reply: SuccessSchema | ErrorSchema;
  }>(
    '/topHolders',
    {
      schema: {
        params: paramsSchema,
        response: {
          '2XX': successSchema,
          '404': errorSchema,
        },
      },
    },
    async function (request, reply) {
      const { chainId, tokenAddress } = request.params;

      const tokenHolders = await tokenHolderService.getTopTokenHolders(
        chainId,
        tokenAddress
      );
      fastify.log.info(
        `Get token holders for ${tokenAddress} on chain ${chainId}: ${tokenHolders?.length} holder found`
      );
      if (tokenHolders === null) {
        reply.code(404).send({ message: 'Token holders not found' });
        return;
      }

      reply.send(tokenHolders);
    }
  );
};

export default root;
