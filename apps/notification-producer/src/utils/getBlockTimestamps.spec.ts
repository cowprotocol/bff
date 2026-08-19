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
})
