import { OrderParameters, SupportedChainId } from '@cowprotocol/cow-sdk';
import { ethers } from 'ethers';
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

const NETWORKS = ['mainnet', 'goerli'];

export interface TwapPartOrderItem {
  uid: string;
  index: number;
  chainId: SupportedChainId;
  safeAddress: string;
  twapOrderId: string;
  order: OrderParameters;
}

type SafeTransactionParams = {
  submissionDate: string;
  executionDate: string | null;
  isExecuted: boolean;
  nonce: number;
  confirmationsRequired: number;
  confirmations: number;
  safeTxHash: string;
};

interface ConditionalOrderParams {
  staticInput: string;
  salt: string;
  handler: string;
}

export interface TwapOrdersSafeData {
  conditionalOrderParams: ConditionalOrderParams;
  safeTxParams: SafeTransactionParams;
}

function infuraPlugin(
  fastify: FastifyInstance,
  _: Record<string, unknown>,
  done: () => void
) {
  const providers = NETWORKS.map(
    (network) => new ethers.providers.InfuraProvider(network)
  );

  fastify.ready((err) => {
    if (err) {
      console.error('Could not start infura plugin: ', err);
    }

    providers.forEach(async (provider) => {
      const network = await provider.getNetwork();
      fastify.processConditionalOrders(provider, network);
    });
  });

  done();
}

export default fp(async function (fastify: FastifyInstance) {
  fastify.register(infuraPlugin);
});
