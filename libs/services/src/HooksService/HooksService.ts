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

      // Wait for execution to complete
      const result = await this.duneRepository.waitForExecution(
        execution.execution_id
      );

      // Transform the raw data to typed HookData
      return result.result.rows.map((row: any) => ({
        environment: row.environment,
        block_time: row.block_time,
        is_bridging: row.is_bridging,
        success: row.success,
        app_code: row.app_code,
        destination_chain_id: row.destination_chain_id,
        destination_token_address: row.destination_token_address,
        hook_type: row.hook_type,
        app_id: row.app_id,
        target: row.target,
        gas_limit: row.gas_limit,
        app_hash: row.app_hash,
        tx_hash: row.tx_hash,
      }));
    } catch (error) {
      throw new Error(
        `Failed to fetch hooks data: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }
}
