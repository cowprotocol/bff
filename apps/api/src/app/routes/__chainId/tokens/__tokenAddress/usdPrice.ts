import { UsdService, usdServiceSymbol } from '@cowprotocol/services';
import { FastifyPluginAsync } from 'fastify';
import { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { apiContainer } from '../../../../inversify.config';
import {
  ChainIdOrSlugSchema,
  OptionalAddressSchema,
} from '../../../../schemas';

const paramsSchema = {
  type: 'object',
  required: ['chainId', 'tokenAddress'],
  additionalProperties: false,
  properties: {
    chainId: ChainIdOrSlugSchema,
    tokenAddress: OptionalAddressSchema,
  },
} as const satisfies JSONSchema;

const successSchema = {
  type: 'object',
  required: ['price'],
  additionalProperties: false,
  properties: {
    price: {
      title: 'Price',
      description: 'Current price of the token in USD.',
      type: 'number',
      examples: [3561.1267842],
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

const usdService: UsdService = apiContainer.get(usdServiceSymbol);

const root: FastifyPluginAsync = async (fastify): Promise<void> => {
  // example: http://localhost:3010/1/tokens/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/usdPrice
  fastify.get<{
    Params: RouteSchema;
    Reply: SuccessSchema | ErrorSchema;
  }>(
    '/usdPrice',
    {
      schema: {
        description: 'Get USD price for a given token',
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

      fastify.log.info(`Get USD price for ${tokenAddress} on chain ${chainId}`);

      const price = await usdService.getUsdPrice(
        chainId,
        tokenAddress === '-' ? undefined : tokenAddress
      );
      fastify.log.info(
        `Get USD value for ${tokenAddress} on chain ${chainId}: ${price}`
      );
      if (price === null) {
        reply.code(404).send({ message: 'Price not found' });
        return;
      }

      reply.send({ price });
    }
  );
};

export default root;
