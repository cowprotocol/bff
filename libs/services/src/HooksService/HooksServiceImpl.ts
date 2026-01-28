import { DuneRepository } from '@cowprotocol/repositories';
import { GetHooksParams, HookData, HooksService } from './HooksService';
import { isHookData } from './utils/isHookData';

const DEFAULT_QUERY_ID = 5302473; // Example on executing a query

export class HooksServiceImpl implements HooksService {
  private readonly duneRepository: DuneRepository;

  constructor(duneRepository: DuneRepository) {
    this.duneRepository = duneRepository;
  }

  async getHooks(params: GetHooksParams): Promise<HookData[]> {
    const { blockchain, period, maxWaitTimeMs, limit, offset } = params;

    // Execute the query with parameters
    const execution = await this.duneRepository.executeQuery({
      queryId: DEFAULT_QUERY_ID,
      parameters: {
        blockchain,
        period,
      },
    });

    // Wait for execution to complete with type assertion
    await this.duneRepository.waitForExecution<HookData>({
      executionId: execution.execution_id,
      typeAssertion: isHookData,
      maxWaitTimeMs,
    });

    const result = await this.duneRepository.getQueryResults<HookData>({
      queryId: DEFAULT_QUERY_ID,
      limit,
      offset,
      typeAssertion: isHookData,
    });

    return result.result.rows;
  }
}
