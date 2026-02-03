import { JSONSchema } from 'json-schema-to-ts';
import { AddressSchema } from '../../../../schemas';

export const paramsSchema = {
  type: 'object',
  required: ['address'],
  additionalProperties: false,
  properties: {
    address: AddressSchema,
  },
} as const satisfies JSONSchema;

export const affiliateStatsSchema = {
  type: 'object',
  required: [
    'affiliate_address',
    'referrer_code',
    'total_volume',
    'trigger_volume',
    'total_earned',
    'paid_out',
    'next_payout',
    'left_to_next_reward',
    'active_traders',
    'total_traders',
    'lastUpdatedAt',
  ],
  additionalProperties: false,
  properties: {
    affiliate_address: { type: 'string' },
    referrer_code: { type: 'string' },
    total_volume: { type: 'number' },
    trigger_volume: { type: 'number' },
    total_earned: { type: 'number' },
    paid_out: { type: 'number' },
    next_payout: { type: 'number' },
    left_to_next_reward: { type: 'number' },
    active_traders: { type: 'number' },
    total_traders: { type: 'number' },
    lastUpdatedAt: { type: 'string' },
  },
} as const satisfies JSONSchema;

export const responseSchema = affiliateStatsSchema;

export const errorSchema = {
  type: 'object',
  required: ['message'],
  additionalProperties: false,
  properties: {
    message: { type: 'string' },
  },
} as const satisfies JSONSchema;
