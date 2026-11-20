import { SOL_ADDRESS_PATTERN, SupportedChainId } from '@cowprotocol/cow-sdk'
import { JSONSchema } from 'json-schema-to-ts'
import { AddressSchema, SupportedChainIdSchema } from '../../../../schemas'

export const tokenRestrictionsParamsSchema = {
  type: 'object',
  required: ['chainId', 'tokenAddress'],
  additionalProperties: false,
  properties: {
    chainId: SupportedChainIdSchema,
    tokenAddress: { type: 'string' },
  },
  if: { properties: { chainId: { type: 'integer', const: SupportedChainId.SOLANA } } },
  then: { properties: { tokenAddress: { type: 'string', pattern: SOL_ADDRESS_PATTERN.source } } },
  else: { properties: { tokenAddress: AddressSchema } },
} as const satisfies JSONSchema

export const tokenRestrictionsQuerySchema = {
  type: 'object',
  required: ['countryCode'],
  additionalProperties: false,
  properties: {
    countryCode: {
      title: 'Country code',
      description: 'ISO 3166-1 alpha-2 country code (case-insensitive), e.g. US.',
      type: 'string',
      pattern: '^[A-Za-z]{2}$',
    },
  },
} as const satisfies JSONSchema

export const tokenRestrictionsResponseSchema = {
  oneOf: [
    {
      type: 'object',
      required: ['restricted', 'tokenList'],
      additionalProperties: false,
      properties: {
        restricted: { type: 'boolean', const: true },
        tokenList: { type: 'string', description: 'Name of the restricted token list that matched' },
      },
    },
    {
      type: 'object',
      required: ['restricted'],
      additionalProperties: false,
      properties: {
        restricted: { type: 'boolean', const: false },
      },
    },
  ],
} as const satisfies JSONSchema

export const tokenRestrictionsErrorSchema = {
  type: 'object',
  required: ['message'],
  additionalProperties: false,
  properties: {
    message: { type: 'string' },
  },
} as const satisfies JSONSchema
