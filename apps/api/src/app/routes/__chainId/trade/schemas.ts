import { ChainIdSchema } from '../../../schemas';
import { JSONSchema } from 'json-schema-to-ts';

import QuoterParametersSchema from './tradingSchemas/QuoterParameters';
import TradeParametersSchema from './tradingSchemas/TradeParameters';
import QuoteResultsSchema from './tradingSchemas/QuoteResultsSerialized';

export const routeSchema = {
  type: 'object',
  required: ['chainId'],
  additionalProperties: false,
  properties: {
    chainId: ChainIdSchema,
  },
} as const satisfies JSONSchema;

export const bodySchema = {
  type: 'object',
  required: ['trader'],
  additionalProperties: false,
  properties: {
    trader: QuoterParametersSchema,
    params: TradeParametersSchema
  },
} as const satisfies JSONSchema;

export const successSchema = QuoteResultsSchema;

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