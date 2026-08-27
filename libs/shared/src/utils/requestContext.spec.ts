import { getRequestContext, requestContext } from './requestContext'

describe('requestContext', () => {
  it('is undefined outside a request', () => {
    expect(getRequestContext()).toBeUndefined()
  })

  it('survives the async hops a repository call makes', async () => {
    // The point of the store: UsdRepositoryFallback logs after several awaits and a timer, far from
    // the Fastify hook that set the id.
    const seen = await new Promise<string | undefined>((resolve) => {
      requestContext.run({ reqId: 'req-42' }, () => {
        Promise.resolve()
          .then(() => new Promise((r) => setTimeout(r, 1)))
          .then(() => resolve(getRequestContext()?.reqId))
      })
    })

    expect(seen).toBe('req-42')
  })

  it('keeps concurrent requests separate', async () => {
    const read = (reqId: string) =>
      new Promise<string | undefined>((resolve) => {
        requestContext.run({ reqId }, () => {
          setTimeout(() => resolve(getRequestContext()?.reqId), Math.random() * 5)
        })
      })

    await expect(Promise.all([read('a'), read('b'), read('c')])).resolves.toEqual(['a', 'b', 'c'])
  })
})
