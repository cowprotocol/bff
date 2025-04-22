import { AllChainIds } from '@cowprotocol/shared';

export const SupportedChainIdSchema = {
  title: 'Supported Chain ID',
  description: 'Supported Chain ID',
  enum: AllChainIds,
  type: 'integer',
} as const;

export const AddressSchema = {
  title: 'Address',
  description: 'Ethereum address.',
  type: 'string',
  pattern: '^0x[a-fA-F0-9]{40}$',
} as const;

export const ETHEREUM_ADDRESS_PATTERN = '^0x[a-fA-F0-9]{40}$';
