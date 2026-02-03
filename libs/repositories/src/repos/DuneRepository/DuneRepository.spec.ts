import { DuneExecutionResponse, DuneResultResponse } from './DuneRepository';
import { DuneRepositoryImpl } from './DuneRepositoryImpl';

// Mock fetch globally
global.fetch = jest.fn();

describe('DuneRepositoryImpl', () => {
  let repository: DuneRepositoryImpl;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    repository = new DuneRepositoryImpl(mockApiKey);
    jest.clearAllMocks();
  });

  describe('executeQuery', () => {
    it('should execute a query successfully with parameters', async () => {
      const mockResponse: DuneExecutionResponse = {
        execution_id: 'test-execution-123',
        state: 'QUERY_STATE_PENDING',
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockResponse,
      });

      const result = await repository.executeQuery({
        queryId: 12345,
        parameters: { param1: 'value1', param2: 42 },
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://api.dune.com/api/v1/query/12345/execute',
        {
          method: 'POST',
          headers: {
            'X-DUNE-API-KEY': mockApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query_parameters: { param1: 'value1', param2: 42 },
          }),
        }
      );

      expect(result).toEqual(mockResponse);
    });

    it('should execute a query with performance parameter', async () => {
      const mockResponse: DuneExecutionResponse = {
        execution_id: 'test-execution-456',
        state: 'QUERY_STATE_PENDING',
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockResponse,
      });

      const result = await repository.executeQuery({
        queryId: 12345,
        performance: 'large',
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://api.dune.com/api/v1/query/12345/execute',
        {
          method: 'POST',
          headers: {
            'X-DUNE-API-KEY': mockApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ performance: 'large' }),
        }
      );

      expect(result).toEqual(mockResponse);
    });

    it('should execute a query with both parameters and performance', async () => {
      const mockResponse: DuneExecutionResponse = {
        execution_id: 'test-execution-789',
        state: 'QUERY_STATE_PENDING',
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockResponse,
      });

      const result = await repository.executeQuery({
        queryId: 12345,
        parameters: { param1: 'value1' },
        performance: 'large',
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://api.dune.com/api/v1/query/12345/execute',
        {
          method: 'POST',
          headers: {
            'X-DUNE-API-KEY': mockApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query_parameters: { param1: 'value1' },
            performance: 'large',
          }),
        }
      );

      expect(result).toEqual(mockResponse);
    });

    it('should execute a query without parameters', async () => {
      const mockResponse: DuneExecutionResponse = {
        execution_id: 'test-execution-456',
        state: 'QUERY_STATE_PENDING',
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockResponse,
      });

      const result = await repository.executeQuery({
        queryId: 12345,
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://api.dune.com/api/v1/query/12345/execute',
        {
          method: 'POST',
          headers: {
            'X-DUNE-API-KEY': mockApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      await expect(
        repository.executeQuery({
          queryId: 12345,
        })
      ).rejects.toThrow('Dune API request failed: 400 Bad Request');
    });
  });

  describe('getExecutionResults', () => {
    it('should get execution results successfully', async () => {
      const mockResponse: DuneResultResponse<unknown> = {
        execution_id: 'test-execution-123',
        query_id: 12345,
        is_execution_finished: true,
        state: 'QUERY_STATE_COMPLETED',
        submitted_at: '2025-01-01T00:00:00Z',
        expires_at: '2025-01-02T00:00:00Z',
        execution_started_at: '2025-01-01T00:00:01Z',
        execution_ended_at: '2025-01-01T00:00:05Z',
        result: {
          rows: [{ column1: 'value1', column2: 42 }],
          metadata: {
            column_names: ['column1', 'column2'],
            column_types: ['varchar', 'integer'],
            row_count: 1,
            result_set_bytes: 100,
            total_row_count: 1,
            total_result_set_bytes: 100,
            datapoint_count: 2,
            pending_time_millis: 100,
            execution_time_millis: 500,
          },
        },
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockResponse,
      });

      const result = await repository.getExecutionResults({
        executionId: 'test-execution-123',
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://api.dune.com/api/v1/execution/test-execution-123/results',
        {
          headers: {
            'X-DUNE-API-KEY': mockApiKey,
          },
        }
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(
        repository.getExecutionResults({
          executionId: 'test-execution-123',
        })
      ).rejects.toThrow('Dune API request failed: 404 Not Found');
    });
  });

  describe('waitForExecution', () => {
    it('should wait for execution to complete successfully', async () => {
      const mockResponse: DuneResultResponse<unknown> = {
        execution_id: 'test-execution-123',
        query_id: 12345,
        is_execution_finished: true,
        state: 'QUERY_STATE_COMPLETED',
        submitted_at: '2025-01-01T00:00:00Z',
        expires_at: '2025-01-02T00:00:00Z',
        execution_started_at: '2025-01-01T00:00:01Z',
        execution_ended_at: '2025-01-01T00:00:05Z',
        result: {
          rows: [{ column1: 'value1', column2: 42 }],
          metadata: {
            column_names: ['column1', 'column2'],
            column_types: ['varchar', 'integer'],
            row_count: 1,
            result_set_bytes: 100,
            total_row_count: 1,
            total_result_set_bytes: 100,
            datapoint_count: 2,
            pending_time_millis: 100,
            execution_time_millis: 500,
          },
        },
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockResponse,
      });

      const result = await repository.waitForExecution({
        executionId: 'test-execution-123',
      });

      expect(result).toEqual(mockResponse);
    });

    it('should validate data with type assertion function', async () => {
      const validData = [
        {
          environment: 'prod',
          block_time: '2025-01-01 12:00:00.000 UTC',
          is_bridging: false,
          success: true,
          app_code: 'https://example.com/',
          destination_chain_id: null,
          destination_token_address: null,
          hook_type: 'post',
          app_id: null,
          target: '0x1234567890123456789012345678901234567890',
          gas_limit: 250000,
          app_hash:
            '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          tx_hash:
            '0x9876543210987654321098765432109876543210987654321098765432109876',
        },
      ];

      const mockResponse: DuneResultResponse<unknown> = {
        execution_id: 'test-execution-123',
        query_id: 12345,
        is_execution_finished: true,
        state: 'QUERY_STATE_COMPLETED',
        submitted_at: '2025-01-01T00:00:00Z',
        expires_at: '2025-01-02T00:00:00Z',
        execution_started_at: '2025-01-01T00:00:01Z',
        execution_ended_at: '2025-01-01T00:00:05Z',
        result: {
          rows: validData,
          metadata: {
            column_names: [
              'environment',
              'block_time',
              'is_bridging',
              'success',
              'app_code',
              'destination_chain_id',
              'destination_token_address',
              'hook_type',
              'app_id',
              'target',
              'gas_limit',
              'app_hash',
              'tx_hash',
            ],
            column_types: [
              'varchar',
              'timestamp',
              'boolean',
              'boolean',
              'varchar',
              'integer',
              'varbinary',
              'varchar',
              'varchar',
              'varchar',
              'double',
              'varbinary',
              'varbinary',
            ],
            row_count: 1,
            result_set_bytes: 500,
            total_row_count: 1,
            total_result_set_bytes: 500,
            datapoint_count: 13,
            pending_time_millis: 100,
            execution_time_millis: 500,
          },
        },
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockResponse,
      });

      const isHookData = (
        data: unknown
      ): data is {
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
      } => {
        return (
          typeof data === 'object' && data !== null && 'environment' in data
        );
      };

      const result = await repository.waitForExecution({
        executionId: 'test-execution-123',
        typeAssertion: isHookData,
      });

      expect(result).toEqual(mockResponse);
    });

    it('should throw error when data validation fails', async () => {
      const invalidData = [
        {
          environment: 'prod',
          block_time: '2025-01-01 12:00:00.000 UTC',
          is_bridging: 'not-a-boolean',
          success: true,
          app_code: 'https://example.com/',
        },
      ];

      const mockResponse: DuneResultResponse<unknown> = {
        execution_id: 'test-execution-123',
        query_id: 12345,
        is_execution_finished: true,
        state: 'QUERY_STATE_COMPLETED',
        submitted_at: '2025-01-01T00:00:00Z',
        expires_at: '2025-01-02T00:00:00Z',
        execution_started_at: '2025-01-01T00:00:01Z',
        execution_ended_at: '2025-01-01T00:00:05Z',
        result: {
          rows: invalidData,
          metadata: {
            column_names: [
              'environment',
              'block_time',
              'is_bridging',
              'success',
              'app_code',
            ],
            column_types: [
              'varchar',
              'timestamp',
              'boolean',
              'boolean',
              'varchar',
            ],
            row_count: 1,
            result_set_bytes: 100,
            total_row_count: 1,
            total_result_set_bytes: 100,
            datapoint_count: 5,
            pending_time_millis: 100,
            execution_time_millis: 500,
          },
        },
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockResponse,
      });

      const isHookData = (
        data: unknown
      ): data is {
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
      } => {
        if (typeof data !== 'object' || data === null) return false;
        const d = data as Record<string, unknown>;
        return (
          typeof d.environment === 'string' &&
          typeof d.block_time === 'string' &&
          typeof d.is_bridging === 'boolean' &&
          typeof d.success === 'boolean' &&
          typeof d.app_code === 'string'
        );
      };

      await expect(
        repository.waitForExecution({
          executionId: 'test-execution-123',
          typeAssertion: isHookData,
        })
      ).rejects.toThrow(
        'Data validation failed for execution test-execution-123'
      );
    });

    it('should timeout if execution does not complete', async () => {
      const pendingResponse: DuneResultResponse<unknown> = {
        execution_id: 'test-execution-123',
        query_id: 12345,
        is_execution_finished: false,
        state: 'QUERY_STATE_PENDING',
        submitted_at: '2025-01-01T00:00:00Z',
        expires_at: '2025-01-02T00:00:00Z',
        execution_started_at: '2025-01-01T00:00:01Z',
        execution_ended_at: '2025-01-01T00:00:05Z',
        result: {
          rows: [],
          metadata: {
            column_names: [],
            column_types: [],
            row_count: 0,
            result_set_bytes: 0,
            total_row_count: 0,
            total_result_set_bytes: 0,
            datapoint_count: 0,
            pending_time_millis: 0,
            execution_time_millis: 0,
          },
        },
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => pendingResponse,
      });

      await expect(
        repository.waitForExecution({
          executionId: 'test-execution-123',
          maxWaitTimeMs: 1000, // 1 second timeout
        })
      ).rejects.toThrow(
        'Execution test-execution-123 did not complete within 1000ms'
      );
    });
  });
});
