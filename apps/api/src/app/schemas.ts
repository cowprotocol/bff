
export const ChainIdSchema = {
  title: 'Chain ID',
  description: 'Chain ID',
  enum: [1, 100, 42161, 11155111],
  type: 'integer',
} as const

export const ETHEREUM_ADDRESS_PATTERN = "^0x[a-fA-F0-9]{40}$"