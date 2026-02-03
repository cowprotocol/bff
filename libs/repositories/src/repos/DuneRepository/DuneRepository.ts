export const isDuneEnabled = !!process.env.DUNE_API_KEY;

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

export type PerformanceTier = 'medium' | 'large';

export interface UploadCsvParams {
  tableName: string;
  data: string;
  description?: string;
  isPrivate?: boolean;
}

export interface UploadCsvResponse {
  success: boolean;
  message?: string;
}

export interface ExecuteQueryParams {
  queryId: number;
  parameters?: Record<string, unknown>;
  performance?: PerformanceTier;
}

export interface GetExecutionResultsParams {
  executionId: string;
}

export interface WaitForExecutionParams<T> extends WithTypeAssertion<T> {
  executionId: string;
  maxWaitTimeMs?: number;
}

export interface WithTypeAssertion<T> {
  typeAssertion?: (data: unknown) => data is T;
}

export interface GetQueryResultsParams<T> extends WithTypeAssertion<T> {
  queryId: number;
  limit?: number;
  offset?: number;
}

export interface DuneRepository {
  getQueryResults<T>(
    params: GetQueryResultsParams<T>
  ): Promise<DuneResultResponse<T>>;

  executeQuery(params: ExecuteQueryParams): Promise<DuneExecutionResponse>;

  getExecutionResults<T>(
    params: GetExecutionResultsParams
  ): Promise<DuneResultResponse<T>>;

  waitForExecution<T>(
    params: WaitForExecutionParams<T>
  ): Promise<DuneResultResponse<T>>;

  uploadCsv(params: UploadCsvParams): Promise<UploadCsvResponse>;
}
