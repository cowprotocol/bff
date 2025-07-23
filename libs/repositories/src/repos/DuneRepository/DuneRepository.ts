export const duneRepositorySymbol = Symbol.for('DuneRepository');

export interface DuneExecutionResponse {
  execution_id: string;
  state: string;
}

export interface DuneResultResponse {
  execution_id: string;
  query_id: number;
  is_execution_finished: boolean;
  state: string;
  submitted_at: string;
  expires_at: string;
  execution_started_at: string;
  execution_ended_at: string;
  result: {
    rows: any[];
    metadata: {
      column_names: string[];
      column_types: string[];
      row_count: number;
      result_set_bytes: number;
      total_row_count: number;
      total_result_set_bytes: number;
      datapoint_count: number;
      pending_time_millis: number;
      execution_time_millis: number;
    };
  };
}

export interface DuneRepository {
  executeQuery(
    queryId: number,
    parameters?: Record<string, any>
  ): Promise<DuneExecutionResponse>;
  getExecutionResults(executionId: string): Promise<DuneResultResponse>;
  waitForExecution(
    executionId: string,
    maxWaitTimeMs?: number
  ): Promise<DuneResultResponse>;
}

export class DuneRepositoryImpl implements DuneRepository {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.dune.com/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async executeQuery(
    queryId: number,
    parameters?: Record<string, any>
  ): Promise<DuneExecutionResponse> {
    const url = `${this.baseUrl}/query/${queryId}/execute`;
    const options: RequestInit = {
      method: 'POST',
      headers: {
        'X-DUNE-API-KEY': this.apiKey,
        'Content-Type': 'application/json',
      },
    };

    if (parameters) {
      options.body = JSON.stringify({ parameters });
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(
        `Failed to execute Dune query: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  async getExecutionResults(executionId: string): Promise<DuneResultResponse> {
    const url = `${this.baseUrl}/execution/${executionId}/results`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-DUNE-API-KEY': this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to get Dune execution results: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  async waitForExecution(
    executionId: string,
    maxWaitTimeMs = 300000
  ): Promise<DuneResultResponse> {
    const startTime = Date.now();
    const pollInterval = 2000; // Poll every 2 seconds

    while (Date.now() - startTime < maxWaitTimeMs) {
      const result = await this.getExecutionResults(executionId);

      if (result.is_execution_finished) {
        return result;
      }

      // Wait before polling again
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error(
      `Execution ${executionId} did not complete within ${maxWaitTimeMs}ms`
    );
  }
}
