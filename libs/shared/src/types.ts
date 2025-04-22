import pino from 'pino';

// TODO: Import from SDK
export enum SupportedChainId {
  MAINNET = 1,
  GNOSIS_CHAIN = 100,
  BASE = 8453,
  ARBITRUM_ONE = 42161,
  SEPOLIA = 11155111,
}

export type Logger = pino.Logger;
