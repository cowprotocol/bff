import { AllChainIds } from '@cowprotocol/shared';

export const ChainIdSchema = {
  title: 'Chain ID',
  description: 'Chain ID',
  enum: AllChainIds,
  type: 'integer',
} as const;

export const AddressSchema = {
  title: 'Address',
  description: 'Ethereum address.',
  type: 'string',
  pattern: '^0x[a-fA-F0-9]{40}$',
} as const;

export const OrderIdSchema = {
  title: 'Order ID',
  description: 'Order ID',
  type: 'string',
  pattern: '^0x[a-fA-F0-9]{112}$',
} as const;

export const ETHEREUM_ADDRESS_PATTERN = '^0x[a-fA-F0-9]{40}$';
