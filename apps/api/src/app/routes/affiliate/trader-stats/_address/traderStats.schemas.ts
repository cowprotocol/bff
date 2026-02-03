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

export const traderStatsSchema = {
  type: 'object',
  required: [
    'trader_address',
    'bound_referrer_code',
    'linked_since',
    'rewards_end',
    'eligible_volume',
    'left_to_next_rewards',
    'trigger_volume',
    'total_earned',
    'paid_out',
    'next_payout',
    'lastUpdatedAt',
  ],
  additionalProperties: false,
  properties: {
    trader_address: { type: 'string' },
    bound_referrer_code: { type: 'string' },
    linked_since: { type: 'string' },
    rewards_end: { type: 'string' },
    eligible_volume: { type: 'number' },
    left_to_next_rewards: { type: 'number' },
    trigger_volume: { type: 'number' },
    total_earned: { type: 'number' },
    paid_out: { type: 'number' },
    next_payout: { type: 'number' },
    lastUpdatedAt: { type: 'string' },
  },
} as const satisfies JSONSchema;

export const responseSchema = traderStatsSchema;

export const errorSchema = {
  type: 'object',
  required: ['message'],
  additionalProperties: false,
  properties: {
    message: { type: 'string' },
  },
} as const satisfies JSONSchema;
