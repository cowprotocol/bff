import { OrderKind, SupportedChainId } from '@cowprotocol/cow-sdk'
import { Pool } from 'pg'
import { getOrderBookDbEnvironment, getOrderBookDbPool } from '../../datasources/orderBookDbPool'
import { getOrderExecutionPositionKey, OrderExecutionPosition } from './OrdersRepository'
import { OrdersRepositoryPostgres } from './OrdersRepositoryPostgres'

jest.mock('../../datasources/orderBookDbPool', () => ({
  getOrderBookDbEnvironment: jest.fn(),
  getOrderBookDbPool: jest.fn(),
}))

const getOrderBookDbEnvironmentMock = getOrderBookDbEnvironment as jest.MockedFunction<typeof getOrderBookDbEnvironment>
const getOrderBookDbPoolMock = getOrderBookDbPool as jest.MockedFunction<typeof getOrderBookDbPool>
const prodQuery = jest.fn()
const barnQuery = jest.fn()
const prodPool = { query: prodQuery } as unknown as Pool
const barnPool = { query: barnQuery } as unknown as Pool

const prodUid = `0x${'11'.repeat(56)}`
const barnUid = `0x${'22'.repeat(56)}`

function row(uid: string, kind: OrderKind, receiver: Buffer | null = null) {
  return {
    uid: Buffer.from(uid.slice(2), 'hex'),
    partially_fillable: true,
    kind,
    sell_amount: '100',
    buy_amount: '100',
    executed_sell_amount: kind === OrderKind.SELL ? '50' : '0',
    executed_buy_amount: kind === OrderKind.BUY ? '50' : '0',
    receiver,
  }
}

function expectedOrder(uid: string, kind: OrderKind, receiver: string | null = null) {
  return {
    uid,
    partiallyFillable: true,
    kind,
    sellAmount: '100',
    buyAmount: '100',
    receiver,
    executedSellAmount: kind === OrderKind.SELL ? '50' : '0',
    executedBuyAmount: kind === OrderKind.BUY ? '50' : '0',
  }
}

function executionSnapshotRow(
  uid: string,
  kind: OrderKind,
  position: OrderExecutionPosition,
  executedSellAmount: string,
  executedBuyAmount: string
) {
  return {
    ...row(uid, kind),
    position_order_uid: Buffer.from(position.orderUid.slice(2), 'hex'),
    position_block_number: position.blockNumber.toString(),
    position_log_index: position.logIndex.toString(),
    executed_sell_amount: executedSellAmount,
    executed_buy_amount: executedBuyAmount,
  }
}

describe('OrdersRepositoryPostgres', () => {
  const repository = new OrdersRepositoryPostgres()
  const cowProtocolEnv = process.env.COW_PROTOCOL_ENV

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.COW_PROTOCOL_ENV = 'prod'
    getOrderBookDbEnvironmentMock.mockImplementation(() =>
      process.env.COW_PROTOCOL_ENV === 'staging' ? 'barn' : 'prod'
    )
    getOrderBookDbPoolMock.mockImplementation((environment) => (environment === 'prod' ? prodPool : barnPool))
  })

  afterAll(() => {
    if (cowProtocolEnv === undefined) delete process.env.COW_PROTOCOL_ENV
    else process.env.COW_PROTOCOL_ENV = cowProtocolEnv
  })

  it('uses BARN only in staging', async () => {
    process.env.COW_PROTOCOL_ENV = 'staging'
    prodQuery.mockResolvedValue({ rows: [] })
    barnQuery.mockResolvedValue({ rows: [row(barnUid, OrderKind.BUY)] })

    await expect(repository.getOrders(SupportedChainId.MAINNET, [barnUid])).resolves.toEqual(
      new Map([[barnUid, expectedOrder(barnUid, OrderKind.BUY)]])
    )

    expect(prodQuery).not.toHaveBeenCalled()
    expect(barnQuery).toHaveBeenCalled()
  })

  it('uses prod only outside staging', async () => {
    process.env.COW_PROTOCOL_ENV = 'prod'
    prodQuery.mockResolvedValue({ rows: [row(prodUid, OrderKind.SELL)] })
    barnQuery.mockResolvedValue({ rows: [row(barnUid, OrderKind.BUY)] })

    await expect(repository.getOrders(SupportedChainId.MAINNET, [prodUid, barnUid])).resolves.toEqual(
      new Map([[prodUid, expectedOrder(prodUid, OrderKind.SELL)]])
    )
    expect(barnQuery).not.toHaveBeenCalled()
  })

  it('does not query a database when no order UIDs are requested', async () => {
    await expect(repository.getOrders(SupportedChainId.MAINNET, [])).resolves.toEqual(new Map())

    expect(prodQuery).not.toHaveBeenCalled()
    expect(barnQuery).not.toHaveBeenCalled()
  })

  it('derives execution amounts from trades', async () => {
    prodQuery.mockResolvedValue({ rows: [row(prodUid, OrderKind.SELL)] })

    await repository.getOrders(SupportedChainId.MAINNET, [prodUid])

    const [query] = prodQuery.mock.calls[0]
    expect(query).toContain('LEFT JOIN trades t ON t.order_uid = o.uid')
    expect(query).toContain('COALESCE(SUM(t.sell_amount), 0) AS executed_sell_amount')
    expect(query).toContain('COALESCE(SUM(t.buy_amount), 0) AS executed_buy_amount')
  })

  it('loads execution totals at each trade position', async () => {
    const firstPosition = { orderUid: prodUid, blockNumber: 10n, logIndex: 1 }
    const secondPosition = { orderUid: prodUid, blockNumber: 11n, logIndex: 2 }
    prodQuery.mockResolvedValue({
      rows: [
        executionSnapshotRow(prodUid, OrderKind.SELL, firstPosition, '40', '80'),
        executionSnapshotRow(prodUid, OrderKind.SELL, secondPosition, '100', '200'),
      ],
    })

    await expect(
      repository.getOrderExecutionSnapshots(SupportedChainId.MAINNET, [firstPosition, secondPosition])
    ).resolves.toEqual(
      new Map([
        [
          getOrderExecutionPositionKey(firstPosition),
          { ...expectedOrder(prodUid, OrderKind.SELL), executedSellAmount: '40', executedBuyAmount: '80' },
        ],
        [
          getOrderExecutionPositionKey(secondPosition),
          { ...expectedOrder(prodUid, OrderKind.SELL), executedSellAmount: '100', executedBuyAmount: '200' },
        ],
      ])
    )

    const [query] = prodQuery.mock.calls[0]
    expect(query).toContain('t.block_number < p.block_number')
    expect(query).toContain('t.log_index <= p.log_index')
  })

  it('includes a custom recipient', async () => {
    const receiver = '0x0000000000000000000000000000000000000001'
    prodQuery.mockResolvedValue({ rows: [row(prodUid, OrderKind.SELL, Buffer.from(receiver.slice(2), 'hex'))] })

    const orders = await repository.getOrders(SupportedChainId.MAINNET, [prodUid])

    expect(orders.get(prodUid)).toMatchObject({ receiver })
  })
})
