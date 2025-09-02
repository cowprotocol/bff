import { PerformanceTier } from '@cowprotocol/repositories';

export const hooksServiceSymbol = Symbol.for('HooksService');

// Single source of truth - define the values once
const BLOCKCHAIN_VALUES = [
  'mainnet',
  'arbitrum',
  'avalanche',
  'base',
  'gnosis',
  'polygon',
] as const;
const PERIOD_VALUES = [
  'last 3h',
  'last 1d',
  'last 7d',
  'last 30d',
  'last 3m',
  'last 6m',
  'last 12m',
] as const;

// Derive types from the arrays
export type Blockchain = (typeof BLOCKCHAIN_VALUES)[number];
export type Period = (typeof PERIOD_VALUES)[number];

// Export the arrays for runtime use
export { BLOCKCHAIN_VALUES, PERIOD_VALUES };

export interface HookData {
  environment: string;
  block_time: string;
  is_bridging: boolean;
  success: boolean;
  app_code: string;
  destination_chain_id: number | null;
  destination_token_address: string | null;
  hook_type: string;
  app_id: string | null;
  target: string;
  gas_limit: number;
  app_hash: string;
  tx_hash: string;
}

export interface GetHooksParams {
  blockchain: Blockchain;
  period: Period;
  maxWaitTimeMs?: number;
}

export interface GetLatestHooksParams {
  limit?: number;
  offset?: number;
}

export interface HooksService {
  getHooks(params: GetHooksParams): Promise<HookData[]>;

  // TODO: PoC: Since the getHooks params are currently not working. Delete this method after PoC.
  getLatestHooks(params: GetLatestHooksParams): Promise<HookData[]>;
}
