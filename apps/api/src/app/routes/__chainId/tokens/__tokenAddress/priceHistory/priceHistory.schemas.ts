import { JSONSchema } from 'json-schema-to-ts'
import { AddressSchema, SupportedChainIdSchema } from '../../../../../schemas'
import { PRICE_HISTORY_INTERVALS, PRICE_HISTORY_PROVIDER_IDS } from './priceHistory.types'

export const priceHistoryParamsSchema = {
  type: 'object',
  required: ['chainId', 'tokenAddress'],
  additionalProperties: false,
  properties: {
    chainId: SupportedChainIdSchema,
    tokenAddress: AddressSchema,
  },
} as const satisfies JSONSchema

export const priceHistoryQuerySchema = {
  type: 'object',
  required: ['from', 'to', 'interval'],
  additionalProperties: false,
  properties: {
    from: { type: 'integer', minimum: 0, maximum: 2147483647 },
    to: { type: 'integer', minimum: 0, maximum: 2147483647 },
    interval: { type: 'string', enum: PRICE_HISTORY_INTERVALS },
    countback: { type: 'integer', minimum: 1, maximum: 5000 },
  },
} as const satisfies JSONSchema

const priceHistoryBarSchema = {
  type: 'object',
  required: ['timestamp', 'open', 'high', 'low', 'close'],
  additionalProperties: false,
  properties: {
    timestamp: { type: 'integer', minimum: 0 },
    open: { type: 'number', exclusiveMinimum: 0 },
    high: { type: 'number', exclusiveMinimum: 0 },
    low: { type: 'number', exclusiveMinimum: 0 },
    close: { type: 'number', exclusiveMinimum: 0 },
    volume: { type: 'number', minimum: 0 },
  },
} as const satisfies JSONSchema

export const priceHistoryResponseSchema = {
  type: 'object',
  required: ['providerId', 'bars'],
  additionalProperties: false,
  properties: {
    providerId: {
      type: 'integer',
      enum: [PRICE_HISTORY_PROVIDER_IDS.UPSTREAM, PRICE_HISTORY_PROVIDER_IDS.CODEX],
    },
    bars: {
      type: 'array',
      items: priceHistoryBarSchema,
    },
  },
} as const satisfies JSONSchema

export const priceHistoryErrorSchema = {
  type: 'object',
  required: ['message'],
  additionalProperties: false,
  properties: {
    message: { type: 'string' },
  },
} as const satisfies JSONSchema

const nullableNumberArraySchema = {
  type: 'array',
  items: {
    anyOf: [{ type: 'number' }, { type: 'null' }],
  },
} as const satisfies JSONSchema

const nullableStringArraySchema = {
  type: 'array',
  items: {
    anyOf: [{ type: 'string' }, { type: 'null' }],
  },
} as const satisfies JSONSchema

export const codexPriceHistoryPayloadSchema = {
  type: 'object',
  required: ['data'],
  additionalProperties: false,
  properties: {
    data: {
      type: 'object',
      required: ['getTokenBars'],
      additionalProperties: false,
      properties: {
        getTokenBars: {
          type: 'object',
          required: ['o', 'h', 'l', 'c', 't'],
          additionalProperties: false,
          properties: {
            o: nullableNumberArraySchema,
            h: nullableNumberArraySchema,
            l: nullableNumberArraySchema,
            c: nullableNumberArraySchema,
            t: {
              type: 'array',
              items: { type: 'integer', minimum: 0 },
            },
            volume: {
              anyOf: [nullableStringArraySchema, { type: 'null' }],
            },
          },
        },
      },
    },
  },
} as const satisfies JSONSchema

export const upstreamPriceHistoryPayloadSchema = {
  type: 'object',
  required: ['candles'],
  additionalProperties: false,
  properties: {
    candles: {
      type: 'array',
      items: {
        anyOf: [
          { type: 'null' },
          {
            type: 'object',
            required: ['timestamp', 'openUsd', 'highUsd', 'lowUsd', 'closeUsd'],
            additionalProperties: false,
            properties: {
              timestamp: { type: 'string', pattern: '^\\d+$' },
              openUsd: { type: 'number' },
              highUsd: { type: 'number' },
              lowUsd: { type: 'number' },
              closeUsd: { type: 'number' },
            },
          },
        ],
      },
    },
  },
} as const satisfies JSONSchema
