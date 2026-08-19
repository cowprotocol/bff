interface BlockClient {
  getBlock: (params: { blockNumber: bigint }) => Promise<{ number: bigint; timestamp: bigint }>
}

export async function getBlockTimestamps(client: BlockClient, logs: Array<{ blockNumber: bigint | null }>) {
  const blockNumbers = [
    ...new Set(logs.map((log) => log.blockNumber).filter((blockNumber): blockNumber is bigint => blockNumber !== null)),
  ]
  const blocks = await Promise.all(blockNumbers.map((blockNumber) => client.getBlock({ blockNumber })))

  return new Map(blocks.map((block) => [block.number, block.timestamp]))
}
