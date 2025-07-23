import { DuneRepository } from '@cowprotocol/repositories';

export const hooksServiceSymbol = Symbol.for('HooksService');

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
  getHooks(queryId?: number): Promise<HookData[]>;
}

export class HooksServiceMain implements HooksService {
  private readonly duneRepository: DuneRepository;
  private readonly defaultQueryId = 5302473; // Default query ID for hooks

  constructor(duneRepository: DuneRepository) {
    this.duneRepository = duneRepository;
  }

  async getHooks(queryId: number = this.defaultQueryId): Promise<HookData[]> {
    try {
      // Execute the query
      const execution = await this.duneRepository.executeQuery(queryId);

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

  private isHookData(data: any): data is HookData {
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
      if (typeof data[field] !== 'string') {
        return false;
      }
    }

    // Check required boolean fields
    const requiredBooleanFields = ['is_bridging', 'success'];
    for (const field of requiredBooleanFields) {
      if (typeof data[field] !== 'boolean') {
        return false;
      }
    }

    // Check required number field
    if (typeof data.gas_limit !== 'number') {
      return false;
    }

    // Check nullable fields
    if (
      data.destination_chain_id !== null &&
      typeof data.destination_chain_id !== 'number'
    ) {
      return false;
    }
    if (
      data.destination_token_address !== null &&
      typeof data.destination_token_address !== 'string'
    ) {
      return false;
    }
    if (data.app_id !== null && typeof data.app_id !== 'string') {
      return false;
    }

    return true;
  }
}
