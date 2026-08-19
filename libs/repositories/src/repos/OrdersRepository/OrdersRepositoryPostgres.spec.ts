import { OrderKind, SupportedChainId } from '@cowprotocol/cow-sdk'
import { Pool } from 'pg'
import { getOrderBookDbPool } from '../../datasources/orderBookDbPool'
import { OrdersRepositoryPostgres } from './OrdersRepositoryPostgres'

jest.mock('../../datasources/orderBookDbPool', () => ({
  getOrderBookDbPool: jest.fn(),
}))

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

describe('OrdersRepositoryPostgres', () => {
  const repository = new OrdersRepositoryPostgres()

  beforeEach(() => {
    jest.clearAllMocks()
    getOrderBookDbPoolMock.mockImplementation((environment) => (environment === 'prod' ? prodPool : barnPool))
  })

  it('merges BARN-only orders with prod orders', async () => {
    prodQuery.mockResolvedValue({ rows: [row(prodUid, OrderKind.SELL)] })
    barnQuery.mockResolvedValue({ rows: [row(barnUid, OrderKind.BUY)] })

    await expect(repository.getOrders(SupportedChainId.MAINNET, [prodUid, barnUid])).resolves.toEqual(
      new Map([
        [prodUid, expectedOrder(prodUid, OrderKind.SELL)],
        [barnUid, expectedOrder(barnUid, OrderKind.BUY)],
      ])
    )
    expect(barnQuery).toHaveBeenCalledWith(expect.any(String), [[Buffer.from(barnUid.slice(2), 'hex')]])
  })

  it('does not query a database when no order UIDs are requested', async () => {
    await expect(repository.getOrders(SupportedChainId.MAINNET, [])).resolves.toEqual(new Map())

    expect(prodQuery).not.toHaveBeenCalled()
    expect(barnQuery).not.toHaveBeenCalled()
  })

  it('does not query BARN when prod contains every requested order', async () => {
    prodQuery.mockResolvedValue({ rows: [row(prodUid, OrderKind.SELL)] })

    await expect(repository.getOrders(SupportedChainId.MAINNET, [prodUid])).resolves.toEqual(
      new Map([[prodUid, expectedOrder(prodUid, OrderKind.SELL)]])
    )

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

  it('includes a custom recipient', async () => {
    const receiver = '0x0000000000000000000000000000000000000001'
    prodQuery.mockResolvedValue({ rows: [row(prodUid, OrderKind.SELL, Buffer.from(receiver.slice(2), 'hex'))] })

    const orders = await repository.getOrders(SupportedChainId.MAINNET, [prodUid])

    expect(orders.get(prodUid)).toMatchObject({ receiver })
  })
})
