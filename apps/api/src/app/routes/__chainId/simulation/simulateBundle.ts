import { TenderlyService, tenderlyServiceSymbol } from '@cowprotocol/services';
import { FastifyPluginAsync } from 'fastify';
import { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { AddressSchema, ChainIdSchema } from '../../../schemas';
import { apiContainer } from '../../../inversify.config';

const paramsSchema = {
  type: 'object',
  required: ['chainId'],
  additionalProperties: false,
  properties: {
    chainId: ChainIdSchema,
  },
} as const satisfies JSONSchema;

const successSchema = {
  type: 'array',
  items: {
    type: 'object',
    required: ['status', 'id', 'link'],
    additionalProperties: false,
    properties: {
      status: {
        title: 'Status',
        description: 'If the transaction was successful.',
        type: 'boolean',
      },
      id: {
        title: 'ID',
        description: 'Tenderly ID of the transaction.',
        type: 'string',
      },
      link: {
        title: 'Link',
        description: 'Link to the transaction on Tenderly.',
        type: 'string',
      },
    },
  },
} as const satisfies JSONSchema;

const bodySchema = {
  type: 'array',
  items: {
    type: 'object',
    required: ['from', 'to', 'input'],
    additionalProperties: false,
    properties: {
      from: AddressSchema,
      to: AddressSchema,
      value: {
        title: 'Value',
        description: 'Amount of native coin to send.',
        type: 'string',
      },
      input: {
        title: 'Input',
        description: 'Transaction data.',
        type: 'string',
      },
      gas: {
        title: 'Gas',
        description: 'Transaction gas limit.',
        type: 'number',
      },
      gas_price: {
        title: 'Gas price',
        description: 'Gas price.',
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
type BodySchema = FromSchema<typeof bodySchema>;

const tenderlyService: TenderlyService = apiContainer.get(
  tenderlyServiceSymbol
);

const root: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.post<{
    Params: RouteSchema;
    Reply: SuccessSchema | ErrorSchema;
    Body: BodySchema;
  }>(
    '/simulateBundle',
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
      const { chainId } = request.params;

      const simulationResult =
        await tenderlyService.postTenderlyBundleSimulation(
          chainId,
          request.body
        );

      if (simulationResult === null) {
        reply.code(404).send({ message: 'Token holders not found' });
        return;
      }
      fastify.log.info(
        `Post Tenderly bundle of ${request.body.length} simulation on chain ${chainId}`
      );

      reply.send(simulationResult);
    }
  );
};

export default root;
