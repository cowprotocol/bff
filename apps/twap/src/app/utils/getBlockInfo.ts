import { SupportedChainId } from '@cowprotocol/cow-sdk';
import { FastifyInstance } from 'fastify';
import { Block } from '../data/block';
import { providers } from 'ethers';

// Determine the cold start per chain, to be able to process last block again
// This avoids half-processed states.
const isColdStart: Record<SupportedChainId, boolean> = {
  [SupportedChainId.MAINNET]: true,
  [SupportedChainId.GOERLI]: true,
  [SupportedChainId.GNOSIS_CHAIN]: true,
};

// Add lag per network (in confirmations)
const CONFIRMATIONS: Record<SupportedChainId, number> = {
  [SupportedChainId.MAINNET]: 5,
  [SupportedChainId.GOERLI]: 3,
  [SupportedChainId.GNOSIS_CHAIN]: 3,
};

interface BlockInfo {
  fromBlockNumber?: number;
  toBlockNumber: number;
}

export async function getBlockInfo(
  fastify: FastifyInstance,
  provider: providers.InfuraProvider,
  chainId: SupportedChainId
): Promise<BlockInfo> {
  const blockRepository = fastify.orm.getRepository(Block);
  const lastProcessedBlock = (
    await blockRepository.find({
      where: {
        chainId: chainId,
      },
      order: {
        blockNumber: 'DESC',
      },
      take: 1,
    })
  )[0];
  // We process last block again on purpose, on cold start.
  // This way, we can handle any half - processed blocks.
  // However, this means there will always be _at least_ 1 event processed.
  const fromBlockNumber = lastProcessedBlock
    ? lastProcessedBlock.blockNumber + (isColdStart ? 0 : 1)
    : undefined;
  isColdStart[chainId] = false;
  const lastBlockNumber = await provider.getBlockNumber();
  const confirmationsRequired = CONFIRMATIONS[chainId];
  const toBlockNumber = lastBlockNumber - confirmationsRequired;

  return { fromBlockNumber, toBlockNumber };
}
