import { logger } from '@cowprotocol/shared'
import { upstreamLogging } from './upstreamLogging'

type MiddlewareParams = Parameters<NonNullable<ReturnType<typeof upstreamLogging>['onResponse']>>[0]

function call(middleware: ReturnType<typeof upstreamLogging>, params: Partial<MiddlewareParams['params']>): void {
  const args = {
    id: 'call-1',
    schemaPath: '/simple/price',
    params,
    request: { method: 'GET' } as Request,
    response: { status: 200 } as Response,
  } as unknown as MiddlewareParams

  middleware.onRequest?.(args)
  middleware.onResponse?.(args)
}

describe('upstreamLogging', () => {
  let logged: jest.SpyInstance

  beforeEach(() => {
    logged = jest.spyOn(logger, 'info').mockImplementation(() => undefined as never)
  })

  afterEach(() => logged.mockRestore())

  /**
   * The operation alone cannot tell two /native_price calls apart, nor show which coin id an address
   * resolved to. That mapping is where the Base/Linea/Ink wrong-price bug lived.
   */
  it('logs what was actually asked for', () => {
    call(upstreamLogging('coingecko'), { query: { ids: 'ethereum', vs_currencies: 'usd' } })

    expect(logged).toHaveBeenCalledWith(
      expect.objectContaining({
        upstream: 'coingecko',
        operation: '/simple/price',
        status: 200,
        params: { ids: 'ethereum', vs_currencies: 'usd' },
      }),
      'Called coingecko'
    )
  })

  it('merges path params, so two calls to the same operation are distinguishable', () => {
    call(upstreamLogging('cow'), { path: { token: '0xdef1ca1fb7fbcdc777520aa7f396b4e015f497ab' } })

    expect(logged.mock.calls[0][0].params).toEqual({ token: '0xdef1ca1fb7fbcdc777520aa7f396b4e015f497ab' })
  })

  it('never logs headers or cookies, which carry the API key', () => {
    call(upstreamLogging('coingecko'), {
      query: { ids: 'ethereum' },
      header: { 'x-cg-pro-api-key': 'SECRET' },
      cookie: { session: 'SECRET' },
    })

    expect(JSON.stringify(logged.mock.calls[0][0])).not.toContain('SECRET')
  })

  it('reports how long the call took', () => {
    call(upstreamLogging('cow'), { path: { token: '0x0' } })

    expect(logged.mock.calls[0][0]).toHaveProperty('ms', expect.any(Number))
  })
})
