import {
  SimulationService,
  simulationServiceSymbol,
} from '@cowprotocol/services';
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
    required: ['status', 'id', 'link', 'cumulativeBalancesDiff'],
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
      cumulativeBalancesDiff: {
        title: 'Balances Diff',
        description: 'Changes in balances of the token holders.',
        type: 'object',
        additionalProperties: {
          type: 'object',
          additionalProperties: {
            type: 'string',
          },
        },
      },
      stateDiff: {
        title: 'State Diff',
        description: 'Changes in blockchain states.',
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            address: {
              title: 'Address',
              description: 'Contract address where state change occurred',
              type: 'string',
            },
            soltype: {
              title: 'Soltype',
              description: 'Solidity type information',
              type: ['object', 'null'],
              additionalProperties: false,
              properties: {
                name: { type: 'string' },
                type: { type: 'string' },
                storage_location: { type: 'string' },
                offset: { type: 'number' },
                index: { type: 'string' },
                indexed: { type: 'boolean' },
                components: {
                  type: ['array', 'null'],
                  items: {
                    type: 'object',
                  },
                },
              },
            },
            original: {
              title: 'Original',
              description: 'Original value before the state change',
              type: ['string', 'object', 'null'],
            },
            dirty: {
              title: 'Dirty',
              description: 'New value after the state change',
              type: ['string', 'object', 'null'],
            },
            raw: {
              title: 'Raw Elements',
              description: 'Raw state change details',
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  address: { type: 'string' },
                  key: { type: 'string' },
                  original: { type: 'string' },
                  dirty: { type: 'string' },
                },
              },
            },
          },
        },
      },
      gasUsed: {
        title: 'Gas Used',
        description: 'Amount of gas used in the transaction with decimals.',
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

const tenderlyService: SimulationService = apiContainer.get(
  simulationServiceSymbol
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
          '400': errorSchema,
        },
      },
    },
    async function (request, reply) {
      try {
        const { chainId } = request.params;

        fastify.log.info(
          `Starting simulation of ${request.body.length} transactions on chain ${chainId}`
        );

        const simulationResult =
          await tenderlyService.postTenderlyBundleSimulation(
            chainId,
            request.body
          );

        if (simulationResult === null) {
          reply.code(400).send({ message: 'Build simulation error' });
          return;
        }
        fastify.log.info(
          `Post bundle of ${request.body.length} simulation on chain ${chainId}`
        );

        reply.send(simulationResult);
      } catch (e) {
        fastify.log.error('Error in /simulateBundle', e);
        reply.code(500).send({ message: 'Error in /simulateBundle' });
      }
    }
  );
};

export default root;
