import { JSONSchema } from 'json-schema-to-ts'
import { AddressSchema, SupportedChainIdSchema } from '../../../../../schemas'

export const supplyParamsSchema = {
  type: 'object',
  required: ['chainId', 'tokenAddress'],
  additionalProperties: false,
  properties: {
    chainId: SupportedChainIdSchema,
    tokenAddress: AddressSchema,
  },
} as const satisfies JSONSchema

export const supplyResponseSchema = {
  type: 'object',
  required: ['circulatingSupply', 'totalSupply'],
  additionalProperties: false,
  properties: {
    circulatingSupply: { type: ['number', 'null'], minimum: 0 },
    totalSupply: { type: ['number', 'null'], minimum: 0 },
  },
} as const satisfies JSONSchema

export const supplyErrorSchema = {
  type: 'object',
  required: ['message'],
  additionalProperties: false,
  properties: {
    message: { type: 'string' },
  },
} as const satisfies JSONSchema
