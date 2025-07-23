export const duneRepositorySymbol = Symbol.for('DuneRepository');

export interface DuneExecutionResponse {
  execution_id: string;
  state: string;
}

export interface DuneResultResponse<T> {
  execution_id: string;
  query_id: number;
  is_execution_finished: boolean;
  state: string;
  submitted_at: string;
  expires_at: string;
  execution_started_at: string;
  execution_ended_at: string;
  result: {
    rows: T[];
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
  getExecutionResults<T>(executionId: string): Promise<DuneResultResponse<T>>;
  waitForExecution<T>(
    executionId: string,
    maxWaitTimeMs?: number,
    typeAssertion?: (data: any) => data is T
  ): Promise<DuneResultResponse<T>>;
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

  async getExecutionResults<T>(
    executionId: string
  ): Promise<DuneResultResponse<T>> {
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

  async waitForExecution<T>(
    executionId: string,
    maxWaitTimeMs = 300000,
    typeAssertion?: (data: any) => data is T
  ): Promise<DuneResultResponse<T>> {
    const startTime = Date.now();
    const pollInterval = 2000; // Poll every 2 seconds

    while (Date.now() - startTime < maxWaitTimeMs) {
      const result = await this.getExecutionResults<T>(executionId);

      if (result.is_execution_finished) {
        // If type assertion is provided, validate the data
        if (typeAssertion && result.result.rows.length > 0) {
          const invalidRows: any[] = [];
          const isValid = result.result.rows.every((row, index) => {
            if (!typeAssertion(row)) {
              invalidRows.push({ index, data: row });
              return false;
            }
            return true;
          });

          if (!isValid) {
            const errorMessage = `Data validation failed for execution ${executionId}. Some rows do not match the expected type.`;
            const debugInfo = `\nInvalid rows found: ${invalidRows.length}/${result.result.rows.length}`;
            const exampleData =
              invalidRows.length > 0
                ? `\nExample invalid row (index ${
                    invalidRows[0].index
                  }):\n${JSON.stringify(invalidRows[0].data, null, 2)}`
                : '';
            const expectedColumns = result.result.metadata?.column_names
              ? `\nExpected columns from Dune: ${result.result.metadata.column_names.join(
                  ', '
                )}`
              : '';

            throw new Error(
              errorMessage + debugInfo + exampleData + expectedColumns
            );
          }
        }
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
