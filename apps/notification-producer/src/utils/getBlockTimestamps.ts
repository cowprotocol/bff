import { logger } from '@cowprotocol/shared'

interface BlockClient {
  getBlock: (params: { blockNumber: bigint }) => Promise<{ number: bigint; timestamp: bigint }>
}

const BLOCK_FETCH_BATCH_SIZE = 10

export async function getBlockTimestamps(client: BlockClient, logs: Array<{ blockNumber: bigint | null }>) {
  const blockNumbers = [
    ...new Set(logs.map((log) => log.blockNumber).filter((blockNumber): blockNumber is bigint => blockNumber !== null)),
  ]
  const blocks: Array<{ number: bigint; timestamp: bigint }> = []

  for (let index = 0; index < blockNumbers.length; index += BLOCK_FETCH_BATCH_SIZE) {
    const batch = blockNumbers.slice(index, index + BLOCK_FETCH_BATCH_SIZE)
    const results = await Promise.all(
      batch.map(async (blockNumber) => {
        try {
          return await client.getBlock({ blockNumber })
        } catch (e) {
          logger.warn(
            `getBlockTimestamps: failed to fetch block ${blockNumber}, its trades will be skipped this round: ${e}`
          )
          return undefined
        }
      })
    )

    blocks.push(...results.filter((block): block is { number: bigint; timestamp: bigint } => block !== undefined))
  }

  return new Map(blocks.map((block) => [block.number, block.timestamp]))
}
