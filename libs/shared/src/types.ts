// TODO: Import from SDK
export enum SupportedChainId {
  MAINNET = 1,
  GNOSIS_CHAIN = 100,
  ARBITRUM_ONE = 42161,
  SEPOLIA = 11155111,
}

export const ALL_CHAIN_IDS: SupportedChainId[] = Object.values(SupportedChainId)
  .filter((value) => typeof value === 'number') // Filter out non-numeric values
  .map((value) => value as number); // Map to number
