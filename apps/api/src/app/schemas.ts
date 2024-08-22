import { AllChainIds } from '@cowprotocol/shared';

export const ChainIdSchema = {
  title: 'Chain ID',
  description: 'Chain ID',
  enum: AllChainIds,
  type: 'integer',
} as const;

export const ETHEREUM_ADDRESS_PATTERN = '^0x[a-fA-F0-9]{40}$';
