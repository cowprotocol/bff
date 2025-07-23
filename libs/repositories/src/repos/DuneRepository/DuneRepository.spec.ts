import { DuneRepositoryImpl, DuneResultResponse } from './DuneRepository';

// Test interface
interface TestData {
  id: number;
  name: string;
  active: boolean;
}

// Type assertion function
function isTestData(data: any): data is TestData {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.id === 'number' &&
    typeof data.name === 'string' &&
    typeof data.active === 'boolean'
  );
}

// Mock repository for testing
class MockDuneRepository extends DuneRepositoryImpl {
  private mockResult: DuneResultResponse<any>;

  constructor(mockResult: DuneResultResponse<any>) {
    super('mock-key');
    this.mockResult = mockResult;
  }

  async getExecutionResults<T>(): Promise<DuneResultResponse<T>> {
    return this.mockResult as DuneResultResponse<T>;
  }
}

describe('DuneRepository', () => {
  describe('waitForExecution with type assertion', () => {
    it('should pass validation when all rows match the expected type', async () => {
      const validResult: DuneResultResponse<TestData> = {
        execution_id: 'test-123',
        query_id: 123,
        is_execution_finished: true,
        state: 'QUERY_STATE_COMPLETED',
        submitted_at: '2025-01-01T00:00:00Z',
        expires_at: '2025-01-02T00:00:00Z',
        execution_started_at: '2025-01-01T00:00:01Z',
        execution_ended_at: '2025-01-01T00:00:05Z',
        result: {
          rows: [
            { id: 1, name: 'Test 1', active: true },
            { id: 2, name: 'Test 2', active: false },
            { id: 3, name: 'Test 3', active: true },
          ],
          metadata: {
            column_names: ['id', 'name', 'active'],
            column_types: ['integer', 'varchar', 'boolean'],
            row_count: 3,
            result_set_bytes: 100,
            total_row_count: 3,
            total_result_set_bytes: 100,
            datapoint_count: 3,
            pending_time_millis: 100,
            execution_time_millis: 500,
          },
        },
      };

      const repository = new MockDuneRepository(validResult);

      const result = await repository.waitForExecution<TestData>(
        'test-execution-id',
        1000,
        isTestData
      );

      expect(result.result.rows).toHaveLength(3);
      expect(result.result.rows[0]).toEqual({
        id: 1,
        name: 'Test 1',
        active: true,
      });
      expect(result.result.rows[1]).toEqual({
        id: 2,
        name: 'Test 2',
        active: false,
      });
      expect(result.result.rows[2]).toEqual({
        id: 3,
        name: 'Test 3',
        active: true,
      });
    });

    it('should throw error when some rows do not match the expected type', async () => {
      const invalidResult: DuneResultResponse<any> = {
        execution_id: 'test-123',
        query_id: 123,
        is_execution_finished: true,
        state: 'QUERY_STATE_COMPLETED',
        submitted_at: '2025-01-01T00:00:00Z',
        expires_at: '2025-01-02T00:00:00Z',
        execution_started_at: '2025-01-01T00:00:01Z',
        execution_ended_at: '2025-01-01T00:00:05Z',
        result: {
          rows: [
            { id: 1, name: 'Test 1', active: true }, // Valid
            { id: 2, name: 'Test 2' }, // Missing 'active' field
            { id: '3', name: 'Test 3', active: false }, // Wrong type for 'id'
            { id: 4, name: 'Test 4', active: true, extra: 'field' }, // Extra field
          ],
          metadata: {
            column_names: ['id', 'name', 'active'],
            column_types: ['integer', 'varchar', 'boolean'],
            row_count: 4,
            result_set_bytes: 100,
            total_row_count: 4,
            total_result_set_bytes: 100,
            datapoint_count: 3,
            pending_time_millis: 100,
            execution_time_millis: 500,
          },
        },
      };

      const repository = new MockDuneRepository(invalidResult);

      await expect(
        repository.waitForExecution<TestData>(
          'test-execution-id',
          1000,
          isTestData
        )
      ).rejects.toThrow(
        'Data validation failed for execution test-execution-id'
      );
    });

    it('should include detailed error information in the error message', async () => {
      const invalidResult: DuneResultResponse<any> = {
        execution_id: 'test-123',
        query_id: 123,
        is_execution_finished: true,
        state: 'QUERY_STATE_COMPLETED',
        submitted_at: '2025-01-01T00:00:00Z',
        expires_at: '2025-01-02T00:00:00Z',
        execution_started_at: '2025-01-01T00:00:01Z',
        execution_ended_at: '2025-01-01T00:00:05Z',
        result: {
          rows: [
            { id: 1, name: 'Test 1', active: true }, // Valid
            { id: 2, name: 'Test 2' }, // Invalid - missing 'active'
          ],
          metadata: {
            column_names: ['id', 'name', 'active'],
            column_types: ['integer', 'varchar', 'boolean'],
            row_count: 2,
            result_set_bytes: 100,
            total_row_count: 2,
            total_result_set_bytes: 100,
            datapoint_count: 3,
            pending_time_millis: 100,
            execution_time_millis: 500,
          },
        },
      };

      const repository = new MockDuneRepository(invalidResult);

      try {
        await repository.waitForExecution<TestData>(
          'test-execution-id',
          1000,
          isTestData
        );
        fail('Expected error to be thrown');
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // Check that error message contains expected information
        expect(errorMessage).toContain(
          'Data validation failed for execution test-execution-id'
        );
        expect(errorMessage).toContain('Invalid rows found: 1/2');
        expect(errorMessage).toContain('Example invalid row (index 1):');
        expect(errorMessage).toContain('"id": 2');
        expect(errorMessage).toContain('"name": "Test 2"');
        expect(errorMessage).toContain(
          'Expected columns from Dune: id, name, active'
        );
      }
    });

    it('should pass validation when no type assertion is provided', async () => {
      const result: DuneResultResponse<any> = {
        execution_id: 'test-123',
        query_id: 123,
        is_execution_finished: true,
        state: 'QUERY_STATE_COMPLETED',
        submitted_at: '2025-01-01T00:00:00Z',
        expires_at: '2025-01-02T00:00:00Z',
        execution_started_at: '2025-01-01T00:00:01Z',
        execution_ended_at: '2025-01-01T00:00:05Z',
        result: {
          rows: [
            { id: 1, name: 'Test 1', active: true },
            { id: 2, name: 'Test 2' }, // Invalid data but no validation
            { id: '3', name: 'Test 3', active: false }, // Invalid data but no validation
          ],
          metadata: {
            column_names: ['id', 'name', 'active'],
            column_types: ['integer', 'varchar', 'boolean'],
            row_count: 3,
            result_set_bytes: 100,
            total_row_count: 3,
            total_result_set_bytes: 100,
            datapoint_count: 3,
            pending_time_millis: 100,
            execution_time_millis: 500,
          },
        },
      };

      const repository = new MockDuneRepository(result);

      const executionResult = await repository.waitForExecution(
        'test-execution-id',
        1000
        // No type assertion provided
      );

      expect(executionResult.result.rows).toHaveLength(3);
      expect(executionResult.result.rows[0]).toEqual({
        id: 1,
        name: 'Test 1',
        active: true,
      });
      expect(executionResult.result.rows[1]).toEqual({ id: 2, name: 'Test 2' });
      expect(executionResult.result.rows[2]).toEqual({
        id: '3',
        name: 'Test 3',
        active: false,
      });
    });

    it('should handle empty result set', async () => {
      const emptyResult: DuneResultResponse<TestData> = {
        execution_id: 'test-123',
        query_id: 123,
        is_execution_finished: true,
        state: 'QUERY_STATE_COMPLETED',
        submitted_at: '2025-01-01T00:00:00Z',
        expires_at: '2025-01-02T00:00:00Z',
        execution_started_at: '2025-01-01T00:00:01Z',
        execution_ended_at: '2025-01-01T00:00:05Z',
        result: {
          rows: [], // Empty result set
          metadata: {
            column_names: ['id', 'name', 'active'],
            column_types: ['integer', 'varchar', 'boolean'],
            row_count: 0,
            result_set_bytes: 0,
            total_row_count: 0,
            total_result_set_bytes: 0,
            datapoint_count: 3,
            pending_time_millis: 100,
            execution_time_millis: 500,
          },
        },
      };

      const repository = new MockDuneRepository(emptyResult);

      const result = await repository.waitForExecution<TestData>(
        'test-execution-id',
        1000,
        isTestData
      );

      expect(result.result.rows).toHaveLength(0);
    });
  });
});
