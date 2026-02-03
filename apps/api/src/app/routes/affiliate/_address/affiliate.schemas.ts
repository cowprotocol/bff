import { JSONSchema } from 'json-schema-to-ts';
import { AddressSchema } from '../../../schemas';
import { AFFILIATE_CODE_REGEX } from '../../../config/affiliate';

export const paramsSchema = {
  type: 'object',
  required: ['address'],
  properties: {
    address: AddressSchema,
  },
} as const satisfies JSONSchema;

export const bodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['code', 'walletAddress', 'signedMessage'],
  properties: {
    code: {
      title: 'Affiliate code',
      description:
        'Affiliate code to bind to the wallet. Format: 5-20 uppercase chars (A-Z, 0-9, -, _).',
      type: 'string',
      minLength: 5,
      maxLength: 20,
      pattern: AFFILIATE_CODE_REGEX.source,
    },
    walletAddress: AddressSchema,
    signedMessage: {
      title: 'Signed message',
      description: 'EIP-712 signature produced by the wallet.',
      type: 'string',
      minLength: 1,
    },
  },
} as const satisfies JSONSchema;

export const affiliateGetResponseSchema = {
  type: 'object',
  required: [
    'code',
    'createdAt',
    'rewardAmount',
    'triggerVolume',
    'timeCapDays',
    'volumeCap',
    'revenueSplitAffiliatePct',
    'revenueSplitTraderPct',
    'revenueSplitDaoPct',
  ],
  additionalProperties: false,
  properties: {
    code: {
      type: 'string',
    },
    createdAt: {
      type: 'string',
    },
    rewardAmount: { type: 'number' },
    triggerVolume: { type: 'number' },
    timeCapDays: { type: 'number' },
    volumeCap: { type: 'number' },
    revenueSplitAffiliatePct: { type: 'number' },
    revenueSplitTraderPct: { type: 'number' },
    revenueSplitDaoPct: { type: 'number' },
  },
} as const satisfies JSONSchema;

export const affiliateCreateResponseSchema = {
  type: 'object',
  required: ['code', 'createdAt'],
  additionalProperties: false,
  properties: {
    code: {
      type: 'string',
    },
    createdAt: {
      type: 'string',
    },
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
