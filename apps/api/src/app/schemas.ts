import { ALL_CHAIN_IDS } from '@cowprotocol/repositories';

export const ChainIdSchema = {
  title: 'Chain ID',
  description: 'Chain ID',
  enum: ALL_CHAIN_IDS,
  type: 'integer',
} as const;

export const ETHEREUM_ADDRESS_PATTERN = '^0x[a-fA-F0-9]{40}$';
