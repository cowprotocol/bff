import { logger } from '@cowprotocol/shared';
import {
  DuneExecutionResponse,
  DuneRepository,
  DuneResultResponse,
  ExecuteQueryParams,
  GetExecutionResultsParams,
  GetQueryResultsParams,
  WaitForExecutionParams,
} from './DuneRepository';

export const duneRepositorySymbol = Symbol.for('DuneRepository');

const POLL_TIME = 2000;
const MAX_WAIT_TIME = 300000;
const DEFAULT_LIMIT = 1000;

export class DuneRepositoryImpl implements DuneRepository {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey: string, baseUrl = 'https://api.dune.com/api/v1') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async executeQuery(
    params: ExecuteQueryParams
  ): Promise<DuneExecutionResponse> {
    const { queryId, parameters, performance } = params;

    // Build URL with query parameters
    let url = `/query/${queryId}/execute`;
    const queryParams = new URLSearchParams();

    if (parameters) {
      queryParams.append('query_parameters', JSON.stringify(parameters));
    }

    if (performance) {
      queryParams.append('performance', performance);
    }

    if (queryParams.size > 0) {
      url += `?${queryParams.toString()}`;
    }

    logger.info(
      `Executing Dune query ${queryId} with parameters: ${JSON.stringify(
        parameters
      )} and performance: ${performance || 'medium'}`
    );

    return this.makeRequest<DuneExecutionResponse>(url, {
      method: 'POST',
    });
  }

  async getExecutionResults<T>(
    params: GetExecutionResultsParams
  ): Promise<DuneResultResponse<T>> {
    const { executionId } = params;
    return this.makeRequest<DuneResultResponse<T>>(
      `/execution/${executionId}/results`
    );
  }

  async waitForExecution<T>(
    params: WaitForExecutionParams<T>
  ): Promise<DuneResultResponse<T>> {
    const {
      executionId,
      maxWaitTimeMs = MAX_WAIT_TIME,
      typeAssertion,
    } = params;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTimeMs) {
      const result = await this.getExecutionResults<T>({ executionId });

      if (result.is_execution_finished) {
        // If type assertion is provided, validate the data
        if (typeAssertion && result.result.rows.length > 0) {
          const invalidRows: Array<{ index: number; data: unknown }> = [];
          result.result.rows.forEach((row, index) => {
            if (!typeAssertion(row)) {
              invalidRows.push({ index, data: row });
            }
          });
          const isValid = invalidRows.length === 0;

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
      await new Promise((resolve) => setTimeout(resolve, POLL_TIME));
    }

    throw new Error(
      `Execution ${executionId} did not complete within ${maxWaitTimeMs}ms`
    );
  }

  async getQueryResults<T>(
    params: GetQueryResultsParams<T>
  ): Promise<DuneResultResponse<T>> {
    const { queryId, limit = DEFAULT_LIMIT, offset = 0 } = params;

    const queryParams = new URLSearchParams();
    queryParams.append('limit', limit.toString());
    queryParams.append('offset', offset.toString());

    const url = `/query/${queryId}/results?${queryParams.toString()}`;
    return this.makeRequest<DuneResultResponse<T>>(url, {
      method: 'GET',
    });
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const defaultHeaders = {
      'X-DUNE-API-KEY': this.apiKey,
      'Content-Type': 'application/json',
    };

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    logger.info(
      `Making Dune API request: ${options.method || 'GET'} ${url}${
        options.body ? ` with body: ${options.body}` : ''
      }`
    );

    const response = await fetch(url, requestOptions);

    logger.info(`Dune API response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      throw new Error(
        `Dune API request failed: ${response.status} ${response.statusText}`
      );
    }

    const json = await response.json();
    if (logger.isLevelEnabled('debug')) {
      logger.debug(`Dune API response:\n${JSON.stringify(json, null, 2)}`);
    }

    return json;
  }
}
