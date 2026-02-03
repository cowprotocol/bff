import { BLOCKCHAIN_VALUES, PERIOD_VALUES } from '@cowprotocol/services';

const HOOKS_QUERY_REQUIRED = ['blockchain', 'period'] as const;

export const hooksQuerySchema = {
  type: 'object',
  required: HOOKS_QUERY_REQUIRED,
  properties: {
    blockchain: {
      type: 'string',
      enum: BLOCKCHAIN_VALUES,
      description: 'Blockchain network to query',
    },
    period: {
      type: 'string',
      enum: PERIOD_VALUES,
      description: 'Time period for the query',
    },
    maxWaitTimeMs: {
      type: 'number',
      description: 'Maximum time to wait for query execution in milliseconds',
    },
    limit: {
      type: 'number',
      default: 1000,
      description: 'Number of hooks to return',
    },
    offset: {
      type: 'number',
      default: 0,
      description: 'Number of hooks to skip',
    },
  },
} as const;

const hookItemSchema = {
  type: 'object',
  properties: {
    environment: { type: 'string' },
    block_time: { type: 'string' },
    is_bridging: { type: 'boolean' },
    success: { type: 'boolean' },
    app_code: { type: 'string' },
    destination_chain_id: { type: ['number', 'null'] },
    destination_token_address: { type: ['string', 'null'] },
    hook_type: { type: 'string' },
    app_id: { type: ['string', 'null'] },
    target: { type: 'string' },
    gas_limit: { type: 'number' },
    app_hash: { type: 'string' },
    tx_hash: { type: 'string' },
  },
} as const;

export const hooksResponseSchema = {
  type: 'object',
  properties: {
    hooks: { type: 'array', items: hookItemSchema },
    count: { type: 'number' },
    error: { type: 'string' },
  },
} as const;
