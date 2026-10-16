import { JSONSchema } from 'json-schema-to-ts'

export const searchBodySchema = {
  type: 'object',
  required: ['searchQuery', 'chainId'],
  additionalProperties: false,
  properties: {
    searchQuery: { type: 'string', minLength: 1, maxLength: 256 },
    chainId: { type: 'integer', enum: [1, 11155111, 42161, 10, 137, 43114, 42220, 56, 8453] },
  },
} as const satisfies JSONSchema

export const upstreamResponseSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    tokens: {
      type: 'array',
      items: {
        type: 'object',
        required: ['multichainToken'],
        properties: {
          multichainToken: {
            type: 'object',
            required: ['name', 'symbol', 'type', 'deployments'],
            properties: {
              name: { type: 'string' },
              symbol: { type: 'string' },
              type: { type: 'string', enum: ['TOKEN_TYPE_ERC20', 'TOKEN_TYPE_NATIVE'] },
              project: {
                type: 'object',
                properties: { logoUrl: { type: 'string' } },
              },
              deployments: {
                type: 'object',
                additionalProperties: true,
              },
            },
          },
        },
      },
    },
    suppressedTokens: { type: 'array' },
  },
} as const satisfies JSONSchema

export const deploymentSchema = {
  type: 'object',
  required: ['address'],
  properties: {
    address: { type: 'string', pattern: '^0x[0-9a-fA-F]{40}$' },
    decimals: { type: 'integer', minimum: 0, maximum: 255 },
  },
} as const satisfies JSONSchema
