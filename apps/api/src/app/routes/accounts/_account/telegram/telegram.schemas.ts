import { JSONSchema } from 'json-schema-to-ts'

import { ETHEREUM_ADDRESS_PATTERN } from '../../../../schemas'

export const paramsSchema = {
  type: 'object',
  required: ['account'],
  properties: {
    account: {
      title: 'account',
      description: 'Account of the user',
      type: 'string',
      pattern: ETHEREUM_ADDRESS_PATTERN,
    },
  },
} as const satisfies JSONSchema
