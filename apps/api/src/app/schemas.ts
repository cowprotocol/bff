import { AllChainIds } from '@cowprotocol/shared';

export const SupportedChainIdSchema = {
  title: 'Supported Chain ID',
  description: 'Supported Chain ID',
  enum: AllChainIds,
  type: 'integer',
} as const;

export const ChainIdOrSlugSchema = {
  title: 'Chain ID or Slug',
  description: 'Chain ID (integer) or chain slug (string)',
  type: 'string',
  pattern: '^(\\d{1,20})|([0-9a-z\\-]{3,30})$',
} as const;

export const AddressSchema = {
  title: 'Address',
  description: 'Ethereum address.',
  type: 'string',
  pattern: '^0x[a-fA-F0-9]{40}$',
} as const;

export const OptionalAddressSchema = {
  title: 'Optional Address',
  description:
    'Either provide an Ethereum address or a dash (-) to indicate no address.',
  oneOf: [
    {
      type: 'string',
      pattern: '^0x[a-fA-F0-9]{40}$',
    },
    {
      type: 'string',
      pattern: '^-$',
    },
  ],
} as const;

export const ETHEREUM_ADDRESS_PATTERN = '^0x[a-fA-F0-9]{40}$';
