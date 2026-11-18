import { DuneResultResponse } from './DuneRepository'
import { DuneRepositoryImpl } from './DuneRepositoryImpl'

// Mock fetch globally
global.fetch = jest.fn()

const mockApiKey = 'test-api-key'

function resultResponse(rows: unknown[]): DuneResultResponse<unknown> {
  return {
    execution_id: 'test-execution-123',
    query_id: 12345,
    is_execution_finished: true,
    state: 'QUERY_STATE_COMPLETED',
    submitted_at: '2025-01-01T00:00:00Z',
    expires_at: '2025-01-02T00:00:00Z',
    execution_started_at: '2025-01-01T00:00:01Z',
    execution_ended_at: '2025-01-01T00:00:05Z',
    result: {
      rows,
      metadata: {
        column_names: ['column1', 'column2'],
        column_types: ['varchar', 'integer'],
        row_count: rows.length,
        result_set_bytes: 100,
        total_row_count: rows.length,
        total_result_set_bytes: 100,
        datapoint_count: 2,
        pending_time_millis: 100,
        execution_time_millis: 500,
      },
    },
  }
}

describe('DuneRepositoryImpl', () => {
  let repository: DuneRepositoryImpl

  beforeEach(() => {
    repository = new DuneRepositoryImpl(mockApiKey)
    jest.clearAllMocks()
  })

  describe('getQueryResults', () => {
    it('should page with the default limit', async () => {
      const mockResponse = resultResponse([{ column1: 'value1', column2: 42 }])

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => mockResponse,
      })

      const result = await repository.getQueryResults({ queryId: 12345 })

      expect(fetch).toHaveBeenCalledWith('https://api.dune.com/api/v1/query/12345/results?limit=1000&offset=0', {
        method: 'GET',
        headers: {
          'X-DUNE-API-KEY': mockApiKey,
        },
      })
      expect(result).toEqual(mockResponse)
    })

    it('should pass through an explicit limit and offset', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => resultResponse([]),
      })

      await repository.getQueryResults({ queryId: 12345, limit: 5, offset: 10 })

      expect(fetch).toHaveBeenCalledWith(
        'https://api.dune.com/api/v1/query/12345/results?limit=5&offset=10',
        expect.anything()
      )
    })

    it('should handle API errors', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      await expect(repository.getQueryResults({ queryId: 12345 })).rejects.toThrow(
        'Dune API request failed: 404 Not Found'
      )
    })
  })

  describe('uploadCsv', () => {
    it('should post the csv payload', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ success: true }),
      })

      const result = await repository.uploadCsv({ tableName: 'my_table', data: 'a,b\n1,2', isPrivate: true })

      expect(fetch).toHaveBeenCalledWith('https://api.dune.com/api/v1/uploads/csv', {
        method: 'POST',
        body: JSON.stringify({ table_name: 'my_table', data: 'a,b\n1,2', is_private: true }),
        headers: {
          'X-DUNE-API-KEY': mockApiKey,
          'Content-Type': 'application/json',
        },
      })
      expect(result).toEqual({ success: true })
    })
  })

  describe('response size cap', () => {
    it('should meter the body instead of buffering it with response.json()', async () => {
      const payload = JSON.stringify(resultResponse([]))
      const chunks = [new TextEncoder().encode(payload)]
      let next = 0

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => {
          throw new Error('response.json() buffers without a limit — the body must be metered')
        },
        body: {
          getReader: () => ({
            read: async () =>
              next < chunks.length ? { done: false, value: chunks[next++] } : { done: true, value: undefined },
            cancel: async () => undefined,
          }),
        },
      })

      await expect(repository.getQueryResults({ queryId: 12345 })).resolves.toEqual(resultResponse([]))
    })

    it('should reject a body past the 20MB limit', async () => {
      const chunks = [new Uint8Array(21 * 1024 * 1024)]
      let next = 0

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: {
          getReader: () => ({
            read: async () =>
              next < chunks.length ? { done: false, value: chunks[next++] } : { done: true, value: undefined },
            cancel: async () => undefined,
          }),
        },
      })

      await expect(repository.getQueryResults({ queryId: 12345 })).rejects.toThrow('exceeded the 20971520 byte limit')
    })
  })
})
