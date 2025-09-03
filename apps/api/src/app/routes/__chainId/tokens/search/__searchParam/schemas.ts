import { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { SupportedChainIdSchema } from '../../../../../schemas';
import { AllChainIds } from '@cowprotocol/shared';

export const paramsSchema = {
  type: 'object',
  required: ['chainId', 'searchParam'],
  additionalProperties: false,
  properties: {
    chainId: SupportedChainIdSchema,
    searchParam: {
      title: 'Search Parameter',
      description: 'Token search parameter (name, symbol, or address)',
      type: 'string',
      minLength: 3,
      maxLength: 100,
    },
  },
} as const satisfies JSONSchema;

export const successSchema = {
  type: 'array',
  items: {
    type: 'object',
    required: ['chainId', 'address', 'name', 'symbol', 'decimals', 'logoURI'],
    additionalProperties: false,
    properties: {
      chainId: {
        title: 'Chain ID',
        description: 'Blockchain network identifier.',
        type: 'integer',
        enum: AllChainIds,
      },
      address: {
        title: 'Token Address',
        description: 'Contract address of the token.',
        type: 'string',
        pattern: '^0x[a-fA-F0-9]{40}$',
      },
      name: {
        title: 'Name',
        description: 'Full name of the token.',
        type: 'string',
      },
      symbol: {
        title: 'Symbol',
        description: 'Token symbol/ticker.',
        type: 'string',
      },
      decimals: {
        title: 'Decimals',
        description: 'Number of decimal places for the token.',
        type: 'integer',
        minimum: 0,
        maximum: 18,
      },
      logoURI: {
        title: 'Logo URI',
        description: 'URI to the token logo.',
        type: 'string',
      },
    },
  },
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

export type RouteSchema = FromSchema<typeof paramsSchema>;
export type SuccessSchema = FromSchema<typeof successSchema>;
export type ErrorSchema = FromSchema<typeof errorSchema>;
