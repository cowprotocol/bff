import { getBlockTimestamps } from './getBlockTimestamps'

describe('getBlockTimestamps', () => {
  it('fetches each block only once', async () => {
    const getBlock = jest.fn(async ({ blockNumber }: { blockNumber: bigint }) => ({
      number: blockNumber,
      timestamp: blockNumber * 10n,
    }))

    await expect(
      getBlockTimestamps({ getBlock }, [
        { blockNumber: 10n },
        { blockNumber: 10n },
        { blockNumber: 11n },
        { blockNumber: null },
      ])
    ).resolves.toEqual(
      new Map([
        [10n, 100n],
        [11n, 110n],
      ])
    )

    expect(getBlock).toHaveBeenCalledTimes(2)
  })

  it('fetches blocks in bounded batches and skips failed requests', async () => {
    let inFlight = 0
    let maximumInFlight = 0
    const getBlock = jest.fn(async ({ blockNumber }: { blockNumber: bigint }) => {
      inFlight++
      maximumInFlight = Math.max(maximumInFlight, inFlight)
      await Promise.resolve()
      inFlight--

      if (blockNumber === 11n) throw new Error('block unavailable')

      return { number: blockNumber, timestamp: blockNumber * 10n }
    })
    const logs = Array.from({ length: 12 }, (_, blockNumber) => ({ blockNumber: BigInt(blockNumber) }))

    await expect(getBlockTimestamps({ getBlock }, logs)).resolves.toEqual(
      new Map(logs.filter((log) => log.blockNumber !== 11n).map(({ blockNumber }) => [blockNumber, blockNumber * 10n]))
    )

    expect(maximumInFlight).toBeLessThanOrEqual(10)
  })
})
