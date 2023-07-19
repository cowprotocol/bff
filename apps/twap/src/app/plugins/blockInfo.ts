import { SupportedChainId } from '@cowprotocol/cow-sdk';
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { Block } from '../data/block';
import { providers } from 'ethers';
import { BlockInfo } from '../types/order';

// Determine the cold start per chain, to be able to process last block again
// This avoids half-processed states.
// true: cold start, i.e. application has just started, process last block again.
// false: not cold start, which means application has been running, process from last processed block + 1.
const isColdStart: Record<SupportedChainId, boolean> = {
  [SupportedChainId.MAINNET]: true,
  [SupportedChainId.GOERLI]: true,
  [SupportedChainId.GNOSIS_CHAIN]: true,
};

// Add lag per network (in confirmations)
// Based on calls made for GC at https://docs.gnosischain.com/bridges/governance/decisions/#increase-finalization-time-on-ethereum-mainnet
const CONFIRMATIONS: Record<SupportedChainId, number> = {
  [SupportedChainId.MAINNET]: 20,
  [SupportedChainId.GOERLI]: 20,
  [SupportedChainId.GNOSIS_CHAIN]: 20,
};

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
    ? lastProcessedBlock.blockNumber + (isColdStart[chainId] ? 0 : 1)
    : undefined;
  isColdStart[chainId] = false;
  const lastBlockNumber = await provider.getBlockNumber();
  const confirmationsRequired = CONFIRMATIONS[chainId];
  const toBlockNumber = lastBlockNumber - confirmationsRequired;

  return { fromBlockNumber, toBlockNumber };
}

export default fp(async function (fastify: FastifyInstance) {
  fastify.decorate(
    'blockInfo',
    async function (
      provider: providers.InfuraProvider,
      chainId: SupportedChainId
    ): Promise<BlockInfo> {
      return getBlockInfo(fastify, provider, chainId);
    }
  );
});

declare module 'fastify' {
  interface FastifyInstance {
    blockInfo: (
      provider: providers.InfuraProvider,
      chainId: SupportedChainId
    ) => Promise<BlockInfo>;
  }
}
