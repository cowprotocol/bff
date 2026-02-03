import { JSONSchema } from 'json-schema-to-ts';
import { AFFILIATE_CODE_REGEX } from '../../../config/affiliate';

export const paramsSchema = {
  type: 'object',
  required: ['code'],
  properties: {
    code: {
      title: 'Affiliate code',
      description: 'Affiliate code to validate. Format: 5-20 uppercase chars (A-Z, 0-9, -, _).',
      type: 'string',
      minLength: 5,
      maxLength: 20,
      pattern: AFFILIATE_CODE_REGEX.source,
    },
  },
} as const satisfies JSONSchema;

export const responseSchema = {
  type: 'object',
  required: [
    'code',
    'traderRewardAmount',
    'triggerVolume',
    'timeCapDays',
    'volumeCap',
  ],
  additionalProperties: false,
  properties: {
    code: {
      type: 'string',
    },
    traderRewardAmount: { type: 'number' },
    triggerVolume: { type: 'number' },
    timeCapDays: { type: 'number' },
    volumeCap: { type: 'number' },
  },
} as const satisfies JSONSchema;

export const errorSchema = {
  type: 'object',
  required: ['message'],
  additionalProperties: false,
  properties: {
    message: {
      type: 'string',
    },
  },
} as const satisfies JSONSchema;
