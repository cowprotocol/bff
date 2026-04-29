import { JSONSchema } from 'json-schema-to-ts'
import { AddressSchema } from '../../../../schemas'

export const paramsSchema = {
  type: 'object',
  required: ['address'],
  additionalProperties: false,
  properties: {
    address: AddressSchema,
  },
} as const satisfies JSONSchema

export const traderActivityRowSchema = {
  type: 'object',
  required: [
    'chain_id',
    'creation_date',
    'tx_hash',
    'order_uid',
    'trader_address',
    'sell_token',
    'buy_token',
    'executed_sell_amount',
    'executed_buy_amount',
    'usd_value',
    'eligible_volume_usd',
    'referrer_code',
    'bound_referrer_code',
    'eligibility_reason',
    'is_bound_to_code',
    'is_eligible',
  ],
  additionalProperties: false,
  properties: {
    chain_id: { type: 'number' },
    creation_date: { type: 'string' },
    tx_hash: { type: 'string' },
    order_uid: { type: 'string' },
    trader_address: { type: 'string' },
    sell_token: { type: 'string' },
    buy_token: { type: 'string' },
    executed_sell_amount: { type: 'string' },
    executed_buy_amount: { type: 'string' },
    usd_value: { type: 'number' },
    eligible_volume_usd: { type: 'number' },
    referrer_code: { type: 'string' },
    bound_referrer_code: { type: 'string' },
    eligibility_reason: { type: 'string' },
    is_bound_to_code: { type: 'boolean' },
    is_eligible: { type: 'boolean' },
  },
} as const satisfies JSONSchema

export const responseSchema = {
  type: 'object',
  required: ['rows', 'lastUpdatedAt'],
  additionalProperties: false,
  properties: {
    rows: {
      type: 'array',
      items: traderActivityRowSchema,
    },
    lastUpdatedAt: { type: 'string' },
  },
} as const satisfies JSONSchema

export const errorSchema = {
  type: 'object',
  required: ['message'],
  additionalProperties: false,
  properties: {
    message: { type: 'string' },
  },
} as const satisfies JSONSchema
