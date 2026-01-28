import {
  DuneRepository,
  DuneExecutionResponse,
  DuneResultResponse,
} from '@cowprotocol/repositories';
import { HookData, Blockchain, Period } from './HooksService';
import { HooksServiceImpl } from './HooksServiceImpl';

// Mock DuneRepository for testing
class MockDuneRepository implements DuneRepository {
  private mockExecutionId = 'test-execution-123';
  private mockResult: DuneResultResponse<HookData>;

  constructor(mockResult?: DuneResultResponse<HookData>) {
    this.mockResult = mockResult || this.getDefaultMockResult();
  }

  async executeQuery(): Promise<DuneExecutionResponse> {
    return {
      execution_id: this.mockExecutionId,
      state: 'QUERY_STATE_PENDING',
    };
  }

  async getExecutionResults<T>(): Promise<DuneResultResponse<T>> {
    return this.mockResult as DuneResultResponse<T>;
  }

  async getQueryResults<T>(): Promise<DuneResultResponse<T>> {
    return this.mockResult as DuneResultResponse<T>;
  }

  async waitForExecution<T>(params: {
    executionId: string;
    maxWaitTimeMs?: number;
    typeAssertion?: (data: unknown) => data is T;
  }): Promise<DuneResultResponse<T>> {
    const { typeAssertion } = params;

    // Simulate type validation if provided
    if (typeAssertion && this.mockResult.result.rows.length > 0) {
      const invalidRows: Array<{ index: number; data: unknown }> = [];
      const isValid = this.mockResult.result.rows.every((row, index) => {
        if (!typeAssertion(row)) {
          invalidRows.push({ index, data: row });
          return false;
        }
        return true;
      });

      if (!isValid) {
        throw new Error(
          `Data validation failed for execution ${params.executionId}`
        );
      }
    }

    return this.mockResult as DuneResultResponse<T>;
  }

  private getDefaultMockResult(): DuneResultResponse<HookData> {
    return {
      execution_id: this.mockExecutionId,
      query_id: 5302473,
      is_execution_finished: true,
      state: 'QUERY_STATE_COMPLETED',
      submitted_at: '2025-01-01T00:00:00Z',
      expires_at: '2025-01-02T00:00:00Z',
      execution_started_at: '2025-01-01T00:00:01Z',
      execution_ended_at: '2025-01-01T00:00:05Z',
      result: {
        rows: [
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
          {
            environment: 'prod',
            block_time: '2025-01-01 12:01:00.000 UTC',
            is_bridging: true,
            success: true,
            app_code: 'https://bridge.example.com/',
            destination_chain_id: 137,
            destination_token_address:
              '0x1234567890123456789012345678901234567890',
            hook_type: 'pre',
            app_id: 'bridge-app',
            target: '0xabcdef1234567890abcdef1234567890abcdef1234',
            gas_limit: 300000,
            app_hash:
              '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            tx_hash:
              '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          },
        ],
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
          row_count: 2,
          result_set_bytes: 500,
          total_row_count: 2,
          total_result_set_bytes: 500,
          datapoint_count: 13,
          pending_time_millis: 100,
          execution_time_millis: 500,
        },
      },
    };
  }

  setMockResult(result: DuneResultResponse<HookData>) {
    this.mockResult = result;
  }
}

describe('HooksService', () => {
  let mockRepository: MockDuneRepository;
  let hooksService: HooksServiceImpl;

  beforeEach(() => {
    mockRepository = new MockDuneRepository();
    hooksService = new HooksServiceImpl(mockRepository);
  });

  describe('getHooks', () => {
    it('should return valid hook data when Dune query succeeds', async () => {
      const hooks = await hooksService.getHooks({
        blockchain: 'mainnet',
        period: 'last 7d',
      });

      expect(hooks).toHaveLength(2);
      expect(hooks[0]).toEqual({
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
      });
      expect(hooks[1]).toEqual({
        environment: 'prod',
        block_time: '2025-01-01 12:01:00.000 UTC',
        is_bridging: true,
        success: true,
        app_code: 'https://bridge.example.com/',
        destination_chain_id: 137,
        destination_token_address: '0x1234567890123456789012345678901234567890',
        hook_type: 'pre',
        app_id: 'bridge-app',
        target: '0xabcdef1234567890abcdef1234567890abcdef1234',
        gas_limit: 300000,
        app_hash:
          '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        tx_hash:
          '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      });
    });

    it('should pass correct parameters to Dune repository', async () => {
      const executeQuerySpy = jest.spyOn(mockRepository, 'executeQuery');
      const waitForExecutionSpy = jest.spyOn(
        mockRepository,
        'waitForExecution'
      );

      await hooksService.getHooks({
        blockchain: 'arbitrum',
        period: 'last 1d',
      });

      expect(executeQuerySpy).toHaveBeenCalledWith({
        queryId: 5302473,
        parameters: {
          blockchain: 'arbitrum',
          period: 'last 1d',
        },
      });

      expect(waitForExecutionSpy).toHaveBeenCalledWith({
        executionId: 'test-execution-123',
        typeAssertion: expect.any(Function),
      });
    });

    it('should handle different blockchain and period combinations', async () => {
      const executeQuerySpy = jest.spyOn(mockRepository, 'executeQuery');

      await hooksService.getHooks({
        blockchain: 'polygon',
        period: 'last 30d',
      });

      expect(executeQuerySpy).toHaveBeenCalledWith({
        queryId: 5302473,
        parameters: {
          blockchain: 'polygon',
          period: 'last 30d',
        },
      });
    });

    it('should throw error when Dune repository throws', async () => {
      // Mock repository to throw an error
      jest
        .spyOn(mockRepository, 'executeQuery')
        .mockRejectedValue(new Error('Dune API error'));

      await expect(
        hooksService.getHooks({
          blockchain: 'mainnet',
          period: 'last 7d',
        })
      ).rejects.toThrow('Failed to fetch hooks data: Dune API error');
    });

    it('should throw error when data validation fails', async () => {
      // Create invalid data that doesn't match HookData interface
      const invalidResult: DuneResultResponse<unknown> = {
        execution_id: 'test-execution-123',
        query_id: 5302473,
        is_execution_finished: true,
        state: 'QUERY_STATE_COMPLETED',
        submitted_at: '2025-01-01T00:00:00Z',
        expires_at: '2025-01-02T00:00:00Z',
        execution_started_at: '2025-01-01T00:00:01Z',
        execution_ended_at: '2025-01-01T00:00:05Z',
        result: {
          rows: [
            {
              environment: 'prod',
              block_time: '2025-01-01 12:00:00.000 UTC',
              // Missing required fields
              is_bridging: 'not-a-boolean', // Wrong type
              success: true,
              app_code: 'https://example.com/',
              // Missing other required fields
            },
          ],
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

      mockRepository.setMockResult(
        invalidResult as DuneResultResponse<HookData>
      );

      await expect(
        hooksService.getHooks({
          blockchain: 'mainnet',
          period: 'last 7d',
        })
      ).rejects.toThrow(
        'Data validation failed for execution test-execution-123'
      );
    });

    it('should handle empty result set', async () => {
      const emptyResult: DuneResultResponse<HookData> = {
        execution_id: 'test-execution-123',
        query_id: 5302473,
        is_execution_finished: true,
        state: 'QUERY_STATE_COMPLETED',
        submitted_at: '2025-01-01T00:00:00Z',
        expires_at: '2025-01-02T00:00:00Z',
        execution_started_at: '2025-01-01T00:00:01Z',
        execution_ended_at: '2025-01-01T00:00:05Z',
        result: {
          rows: [],
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
            row_count: 0,
            result_set_bytes: 0,
            total_row_count: 0,
            total_result_set_bytes: 0,
            datapoint_count: 13,
            pending_time_millis: 100,
            execution_time_millis: 500,
          },
        },
      };

      mockRepository.setMockResult(emptyResult);

      const hooks = await hooksService.getHooks({
        blockchain: 'mainnet',
        period: 'last 7d',
      });
      expect(hooks).toHaveLength(0);
    });

    it('should work with all supported blockchain and period combinations', async () => {
      const testCases: Array<{ blockchain: Blockchain; period: Period }> = [
        { blockchain: 'mainnet', period: 'last 3h' },
        { blockchain: 'arbitrum', period: 'last 1d' },
        { blockchain: 'avalanche', period: 'last 7d' },
        { blockchain: 'base', period: 'last 30d' },
        { blockchain: 'gnosis', period: 'last 3m' },
        { blockchain: 'polygon', period: 'last 6m' },
      ];

      for (const { blockchain, period } of testCases) {
        const executeQuerySpy = jest.spyOn(mockRepository, 'executeQuery');

        await hooksService.getHooks({ blockchain, period });

        expect(executeQuerySpy).toHaveBeenCalledWith({
          queryId: 5302473,
          parameters: {
            blockchain,
            period,
          },
        });

        executeQuerySpy.mockClear();
      }
    });
  });
});
