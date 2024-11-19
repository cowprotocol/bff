import { AllChainIds } from '@cowprotocol/shared';

export const ChainIdSchema = {
  title: 'Chain ID',
  description: 'Chain ID',
  enum: AllChainIds,
  type: 'integer',
} as const;

export const ETHEREUM_ADDRESS_PATTERN = '^0x[a-fA-F0-9]{40}$' as const;

export const AddressSchema = {
  title: 'Address',
  description: 'Ethereum address.',
  type: 'string',
  pattern: ETHEREUM_ADDRESS_PATTERN,
} as const;


export const SlippageSchema = {
  title: 'Slippage tolerance in basis points',
  description:
    'Slippage tolerance in basis points. One basis point is equivalent to 0.01% (1/100th of a percent)',
  type: 'number',
  examples: [50, 100, 200],
  minimum: 0,
  maximum: 10000,
} as const;