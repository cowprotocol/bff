import { DuneRepository } from '@cowprotocol/repositories';

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

export interface HooksService {
  getHooks(blockchain: Blockchain, period: Period): Promise<HookData[]>;
}

export class HooksServiceMain implements HooksService {
  private readonly duneRepository: DuneRepository;
  private readonly defaultQueryId = 5302473; // Default query ID for hooks

  constructor(duneRepository: DuneRepository) {
    this.duneRepository = duneRepository;
  }

  async getHooks(blockchain: Blockchain, period: Period): Promise<HookData[]> {
    try {
      // Map blockchain to chain ID for Dune query
      const chainId = this.getChainId(blockchain);

      // Execute the query with parameters
      const execution = await this.duneRepository.executeQuery(
        this.defaultQueryId,
        {
          chain_id: chainId,
          time_period: period,
        }
      );

      // Wait for execution to complete with type assertion
      const result = await this.duneRepository.waitForExecution<HookData>(
        execution.execution_id,
        undefined, // maxWaitTimeMs
        this.isHookData // type assertion function
      );

      // The data is already typed as HookData from the generic repository
      return result.result.rows;
    } catch (error) {
      throw new Error(
        `Failed to fetch hooks data: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  private getChainId(blockchain: Blockchain): number {
    const chainIdMap: Record<Blockchain, number> = {
      mainnet: 1,
      arbitrum: 42161,
      avalanche: 43114,
      base: 8453,
      gnosis: 100,
      polygon: 137,
    };

    return chainIdMap[blockchain];
  }

  private isHookData(data: unknown): data is HookData {
    // Check if data is an object
    if (typeof data !== 'object' || data === null) {
      return false;
    }

    // Check required string fields
    const requiredStringFields = [
      'environment',
      'block_time',
      'app_code',
      'hook_type',
      'target',
      'app_hash',
      'tx_hash',
    ];
    for (const field of requiredStringFields) {
      if (typeof (data as Record<string, unknown>)[field] !== 'string') {
        return false;
      }
    }

    // Check required boolean fields
    const requiredBooleanFields = ['is_bridging', 'success'];
    for (const field of requiredBooleanFields) {
      if (typeof (data as Record<string, unknown>)[field] !== 'boolean') {
        return false;
      }
    }

    // Check required number field
    if (typeof (data as Record<string, unknown>).gas_limit !== 'number') {
      return false;
    }

    // Check nullable fields
    const dataRecord = data as Record<string, unknown>;
    if (
      dataRecord.destination_chain_id !== null &&
      typeof dataRecord.destination_chain_id !== 'number'
    ) {
      return false;
    }
    if (
      dataRecord.destination_token_address !== null &&
      typeof dataRecord.destination_token_address !== 'string'
    ) {
      return false;
    }
    if (dataRecord.app_id !== null && typeof dataRecord.app_id !== 'string') {
      return false;
    }

    return true;
  }
}
