import type {
  DuneExecutionResponse,
  DuneRepository,
  DuneResultResponse,
  UploadCsvParams,
  UploadCsvResponse,
} from '@cowprotocol/repositories'
import { SupportedChainId } from '@cowprotocol/cow-sdk'
import type { TraderActivityRowRaw } from './AffiliateStatsService.types'
import { AffiliateStatsServiceImpl } from './AffiliateStatsServiceImpl'

const TRADER_ADDRESS = '0x0000000000000000000000000000000000000abc'
const TRADER_ADDRESS_CHECKSUM = '0x0000000000000000000000000000000000000AbC'

class MockDuneRepository implements DuneRepository {
  public readonly executeQueryMock = jest.fn<
    Promise<DuneExecutionResponse>,
    Parameters<DuneRepository['executeQuery']>
  >()
  public readonly getQueryResultsMock = jest.fn<Promise<DuneResultResponse<TraderActivityRowRaw>>, [unknown]>()
  public readonly getExecutionResultsMock = jest.fn<Promise<DuneResultResponse<TraderActivityRowRaw>>, [unknown]>()
  public readonly waitForExecutionMock = jest.fn<Promise<DuneResultResponse<TraderActivityRowRaw>>, [unknown]>()
  public readonly uploadCsvMock = jest.fn<Promise<UploadCsvResponse>, [UploadCsvParams]>()

  constructor() {
    this.executeQueryMock.mockResolvedValue({
      execution_id: 'execution-1',
      state: 'QUERY_STATE_PENDING',
    })

    this.getQueryResultsMock.mockResolvedValue(this.createResult([]))
    this.getExecutionResultsMock.mockResolvedValue(this.createResult([]))
    this.waitForExecutionMock.mockResolvedValue(this.createResult([]))
    this.uploadCsvMock.mockResolvedValue({ success: true })
  }

  createResult(rows: TraderActivityRowRaw[]): DuneResultResponse<TraderActivityRowRaw> {
    return {
      execution_id: 'execution-1',
      query_id: 123,
      is_execution_finished: true,
      state: 'QUERY_STATE_COMPLETED',
      submitted_at: '2026-03-18T10:00:00.000Z',
      expires_at: '2026-03-19T10:00:00.000Z',
      execution_started_at: '2026-03-18T10:00:01.000Z',
      execution_ended_at: '2026-03-18T10:00:02.000Z',
      result: {
        rows,
        metadata: {
          column_names: [],
          column_types: [],
          row_count: rows.length,
          result_set_bytes: 0,
          total_row_count: rows.length,
          total_result_set_bytes: 0,
          datapoint_count: rows.length,
          pending_time_millis: 0,
          execution_time_millis: 0,
        },
      },
    }
  }

  executeQuery(...params: Parameters<DuneRepository['executeQuery']>): Promise<DuneExecutionResponse> {
    return this.executeQueryMock(...params)
  }

  async getQueryResults<T>(params: Parameters<DuneRepository['getQueryResults']>[0]): Promise<DuneResultResponse<T>> {
    return (await this.getQueryResultsMock(params)) as DuneResultResponse<T>
  }

  async getExecutionResults<T>(
    params: Parameters<DuneRepository['getExecutionResults']>[0]
  ): Promise<DuneResultResponse<T>> {
    return (await this.getExecutionResultsMock(params)) as DuneResultResponse<T>
  }

  async waitForExecution<T>(params: Parameters<DuneRepository['waitForExecution']>[0]): Promise<DuneResultResponse<T>> {
    return (await this.waitForExecutionMock(params)) as DuneResultResponse<T>
  }

  uploadCsv(params: UploadCsvParams): Promise<UploadCsvResponse> {
    return this.uploadCsvMock(params)
  }
}

function createTraderActivityRowRaw(overrides: Partial<TraderActivityRowRaw> = {}): TraderActivityRowRaw {
  return {
    blockchain: 'ethereum',
    creation_date: '2026-03-18 10:00:00.000 UTC',
    tx_hash: '0x123',
    order_uid: 'uid-1',
    trader_address: TRADER_ADDRESS,
    sell_token: '0xsell-dune',
    buy_token: '0xbuy-dune',
    sell_token_symbol: 'SELL',
    buy_token_symbol: 'BUY',
    executed_sell_amount: '0.04667962868331909',
    executed_buy_amount: '0.00000123',
    usd_value: '123.45',
    eligible_volume_usd: '120.12',
    referrer_code: 'CODE',
    bound_referrer_code: 'CODE',
    eligibility_reason: 'Eligible trade',
    is_bound_to_code: true,
    is_eligible: true,
    ...overrides,
  }
}

describe('AffiliateStatsServiceImpl', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = {
      ...originalEnv,
      DUNE_QUERY_ID_TRADER_STATS: '101',
      DUNE_QUERY_ID_TRADER_ACTIVITY: '102',
      DUNE_QUERY_ID_AFFILIATE_STATS: '103',
    }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('fetches trader activity from latest Dune query results', async () => {
    const duneRepository = new MockDuneRepository()
    const row = createTraderActivityRowRaw()
    duneRepository.getQueryResultsMock.mockResolvedValue(duneRepository.createResult([row]))

    const service = new AffiliateStatsServiceImpl(duneRepository, 60_000)
    const result = await service.getTraderActivity(TRADER_ADDRESS_CHECKSUM)

    expect(duneRepository.getQueryResultsMock).toHaveBeenCalledWith({
      queryId: 102,
      limit: 1000,
      offset: 0,
      typeAssertion: expect.any(Function),
    })
    expect(duneRepository.executeQueryMock).not.toHaveBeenCalled()
    expect(duneRepository.waitForExecutionMock).not.toHaveBeenCalled()
    expect(result.lastUpdatedAt).toBe('2026-03-18T10:00:01.000Z')
    expect(result.rows).toEqual([
      {
        chain_id: SupportedChainId.MAINNET,
        creation_date: row.creation_date,
        tx_hash: row.tx_hash,
        order_uid: row.order_uid,
        trader_address: row.trader_address,
        sell_token: row.sell_token,
        buy_token: row.buy_token,
        sell_token_symbol: row.sell_token_symbol,
        buy_token_symbol: row.buy_token_symbol,
        executed_sell_amount: '0.04667962868331909',
        executed_buy_amount: '0.00000123',
        usd_value: 123.45,
        eligible_volume_usd: 120.12,
        referrer_code: row.referrer_code,
        bound_referrer_code: row.bound_referrer_code,
        eligibility_reason: row.eligibility_reason,
        is_bound_to_code: true,
        is_eligible: true,
      },
    ])
  })

  it('returns empty trader activity rows', async () => {
    const duneRepository = new MockDuneRepository()
    duneRepository.getQueryResultsMock.mockResolvedValue(duneRepository.createResult([]))

    const service = new AffiliateStatsServiceImpl(duneRepository, 60_000)
    const result = await service.getTraderActivity(TRADER_ADDRESS)

    expect(result.rows).toEqual([])
    expect(result.lastUpdatedAt).toBe('2026-03-18T10:00:01.000Z')
  })

  it('uses cache for repeated trader activity requests', async () => {
    const duneRepository = new MockDuneRepository()
    duneRepository.getQueryResultsMock.mockResolvedValue(duneRepository.createResult([createTraderActivityRowRaw()]))

    const service = new AffiliateStatsServiceImpl(duneRepository, 60_000)

    await service.getTraderActivity(TRADER_ADDRESS)
    await service.getTraderActivity(TRADER_ADDRESS_CHECKSUM)

    expect(duneRepository.getQueryResultsMock).toHaveBeenCalledTimes(1)
    expect(duneRepository.executeQueryMock).not.toHaveBeenCalled()
    expect(duneRepository.waitForExecutionMock).not.toHaveBeenCalled()
  })

  it('throws for unsupported blockchains in trader activity rows', async () => {
    const duneRepository = new MockDuneRepository()
    duneRepository.getQueryResultsMock.mockResolvedValue(
      duneRepository.createResult([createTraderActivityRowRaw({ blockchain: 'unknown-chain' })])
    )

    const service = new AffiliateStatsServiceImpl(duneRepository, 60_000)

    await expect(service.getTraderActivity(TRADER_ADDRESS)).rejects.toThrow(
      'Unsupported affiliate trader activity blockchain: unknown-chain'
    )
  })
})
