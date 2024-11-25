import { AddressSchema, ChainIdSchema } from '../../../schemas';
import { JSONSchema } from 'json-schema-to-ts';
import { POOLS_RESULT_LIMIT } from './const';

export const paramsSchema = {
  type: 'object',
  required: ['chainId'],
  additionalProperties: false,
  properties: {
    chainId: ChainIdSchema,
  },
} as const satisfies JSONSchema;

export const poolsInfoSuccessSchema = {
  type: 'array',
  items: {
    type: 'object',
    required: [
      'contract_address',
      // TODO
      // 'chainId',
      // 'provider',
      'apr',
      'fee',
      'tvl',
      'volume'
    ],
    additionalProperties: false,
    properties: {
      contract_address: {
        title: 'Pool address',
        type: 'string',
        pattern: AddressSchema.pattern
      },
      // chainId: ChainIdSchema,
      // provider: {
      //   title: 'Liquidity provider',
      //   type: 'string',
      // },
      apr: {
        title: 'APR',
        description: 'Annual Percentage Rate',
        type: 'number',
      },
      fee: {
        title: 'Fee tier',
        description: 'Pool fee percent',
        type: 'number',
      },
      tvl: {
        title: 'TVL',
        description: 'Total value locked (in USD)',
        type: 'number',
      },
      volume: {
        title: 'Volume 24h',
        description: 'Trading volume in the last 24 hours (in USD)',
        type: 'number',
      },
    },
  },
} as const satisfies JSONSchema;

export const poolsInfoBodySchema = {
  type: 'array',
  items: {
    title: 'Pool address',
    description: 'Blockchain address of the pool',
    type: 'string',
    pattern: AddressSchema.pattern,
  },
  minItems: 1,
  maxItems: POOLS_RESULT_LIMIT
} as const satisfies JSONSchema;

export const errorSchema = {
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