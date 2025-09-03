import { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { SupportedChainIdSchema } from '../../../../schemas';

export const paramsSchema = {
  type: 'object',
  required: ['chainId'],
  additionalProperties: false,
  properties: {
    chainId: SupportedChainIdSchema,
  },
} as const satisfies JSONSchema;

export const successSchema = {
  type: 'boolean',
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
