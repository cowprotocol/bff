import { getOrderBookDbEnvironment } from './orderBookDbPool'

describe('getOrderBookDbEnvironment', () => {
  const cowProtocolEnv = process.env.COW_PROTOCOL_ENV

  afterAll(() => {
    if (cowProtocolEnv === undefined) delete process.env.COW_PROTOCOL_ENV
    else process.env.COW_PROTOCOL_ENV = cowProtocolEnv
  })

  it.each([
    ['staging', 'barn'],
    ['prod', 'prod'],
    [undefined, 'prod'],
  ])('maps %s to %s', (environment, expected) => {
    if (environment === undefined) delete process.env.COW_PROTOCOL_ENV
    else process.env.COW_PROTOCOL_ENV = environment

    expect(getOrderBookDbEnvironment()).toBe(expected)
  })
})
