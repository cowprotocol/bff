import { logger } from '@cowprotocol/shared'
import {
  DuneRepository,
  DuneResultResponse,
  GetQueryResultsParams,
  UploadCsvParams,
  UploadCsvResponse,
} from './DuneRepository'
import { readJsonWithLimit } from '../../utils/readJsonWithLimit'

export const duneRepositorySymbol = Symbol.for('DuneRepository')

const DEFAULT_LIMIT = 1000

export class DuneRepositoryImpl implements DuneRepository {
  private readonly apiKey: string
  private readonly baseUrl: string

  constructor(apiKey: string, baseUrl = 'https://api.dune.com/api/v1') {
    this.apiKey = apiKey
    this.baseUrl = baseUrl
  }

  async getQueryResults<T>(params: GetQueryResultsParams<T>): Promise<DuneResultResponse<T>> {
    const { queryId, limit = DEFAULT_LIMIT, offset = 0 } = params

    const queryParams = new URLSearchParams()
    queryParams.append('limit', limit.toString())
    queryParams.append('offset', offset.toString())

    const url = `/query/${queryId}/results?${queryParams.toString()}`
    return this.makeRequest<DuneResultResponse<T>>(url, {
      method: 'GET',
    })
  }

  async uploadCsv(params: UploadCsvParams): Promise<UploadCsvResponse> {
    const { tableName, data, description, isPrivate } = params
    const payload: Record<string, unknown> = {
      table_name: tableName,
      data,
    }

    if (description) {
      payload.description = description
    }

    if (typeof isPrivate === 'boolean') {
      payload.is_private = isPrivate
    }

    return this.makeRequest<UploadCsvResponse>('/uploads/csv', {}, payload)
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    body?: Record<string, unknown>
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const defaultHeaders = {
      'X-DUNE-API-KEY': this.apiKey,
    }

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    }

    if (body) {
      requestOptions.method = 'POST'
      requestOptions.body = JSON.stringify(body)
      requestOptions.headers = {
        ...requestOptions.headers,
        'Content-Type': 'application/json',
      }
    }

    logger.debug(
      `Making Dune API request: ${requestOptions.method || 'GET'} ${url}${
        requestOptions.body ? ` with body: ${requestOptions.body}` : ''
      }`
    )

    const response = await fetch(url, requestOptions)

    logger.info(`Dune API response: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      let errorBody = 'Unable to read error body'
      const responseText = (response as Partial<Response>).text
      if (typeof responseText === 'function') {
        try {
          errorBody = await responseText.call(response)
        } catch {
          // keep default
        }
      }
      throw new Error(`Dune API request failed: ${response.status} ${response.statusText}. Body: ${errorBody}`)
    }

    // Dune result sets are unbounded; a bare `response.json()` here OOMKilled the api pod on 17 Nov 2026.
    const json = await readJsonWithLimit<T>(response)
    if (logger.isLevelEnabled('debug')) {
      logger.debug(`Dune API response:\n${JSON.stringify(json, null, 2)}`)
    }

    return json
  }
}
