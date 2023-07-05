import { SupportedChainId } from '@cowprotocol/cow-sdk';
import { ethers } from 'ethers';
import { FastifyInstance } from 'fastify';
import { ComposableCoW__factory } from '@cow-web-services/abis';
import fp from 'fastify-plugin';

const NETWORKS = ['goerli'];
export const COMPOSABLE_COW_ADDRESS: Record<SupportedChainId, string> = {
  1: '0xF487887DA5a4b4e3eC114FDAd97dc0F785d72738',
  100: '0xF487887DA5a4b4e3eC114FDAd97dc0F785d72738',
  5: '0xF487887DA5a4b4e3eC114FDAd97dc0F785d72738',
};

const SINCE = 9289470;

function infuraPlugin(
  fastify: FastifyInstance,
  options: any,
  done: () => void
) {
  const providers = NETWORKS.map(
    (network) => new ethers.providers.InfuraProvider(network)
  );

  providers.forEach((provider) => {
    const contract = ComposableCoW__factory.connect(
      COMPOSABLE_COW_ADDRESS[provider.network.chainId],
      provider
    );
    const filter = contract.filters.ConditionalOrderCreated();
    provider.addListener('block', async (blockNumber) => {
      const events = await contract.queryFilter(filter, SINCE, blockNumber);
      // console.log('ConditionalOrderCreated', events);
    });
  });
  done();
}

export default fp(async function (fastify: FastifyInstance) {
  fastify.register(infuraPlugin);
});
