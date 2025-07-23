import { DuneRepository } from '@cowprotocol/repositories';
import {
  GetHooksParams,
  GetLatestHooksParams,
  HookData,
  HooksService,
} from './HooksService';
import { isHookData } from './utils/isHookData';

const DEFAULT_QUERY_ID = 5302473; // Example on executing a query
const DEFAULT_QUERY_LATESTS = 5527161; // Example on getting of a query

export class HooksServiceImpl implements HooksService {
  private readonly duneRepository: DuneRepository;

  constructor(duneRepository: DuneRepository) {
    this.duneRepository = duneRepository;
  }

  async getHooks(params: GetHooksParams): Promise<HookData[]> {
    const { blockchain, period, maxWaitTimeMs, performance } = params;

    // Execute the query with parameters
    const execution = await this.duneRepository.executeQuery({
      queryId: DEFAULT_QUERY_ID,
      parameters: {
        blockchain,
        period,
      },
      performance,
    });

    // Wait for execution to complete with type assertion
    const result = await this.duneRepository.waitForExecution<HookData>({
      executionId: execution.execution_id,
      typeAssertion: isHookData,
      maxWaitTimeMs,
    });

    // The data is already typed as HookData from the generic repository
    return result.result.rows;
  }

  async getLatestHooks(params: GetLatestHooksParams): Promise<HookData[]> {
    const { limit, offset } = params;

    const result = await this.duneRepository.getQueryResults({
      queryId: DEFAULT_QUERY_LATESTS,
      limit,
      offset,
      typeAssertion: isHookData,
    });

    return result.result.rows;
  }
}
