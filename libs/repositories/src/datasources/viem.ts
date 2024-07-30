import {
  createPublicClient,
  http,
  Client,
  Chain,
  PublicClient,
  webSocket,
} from 'viem';
import { arbitrum, gnosis, mainnet, sepolia } from 'viem/chains';
import { ALL_CHAIN_IDS, SupportedChainId } from '../types';

const NETWORKS: Record<SupportedChainId, Chain> = {
  [SupportedChainId.MAINNET]: mainnet,
  [SupportedChainId.GNOSIS_CHAIN]: gnosis,
  [SupportedChainId.ARBITRUM_ONE]: arbitrum,
  [SupportedChainId.SEPOLIA]: sepolia,
};

export const viemClients = ALL_CHAIN_IDS.reduce<
  Record<SupportedChainId, PublicClient>
>((acc, chainId) => {
  const chain = NETWORKS[chainId];
  const rpcEndpoint = process.env[`RPC_URL_${chainId}`];
  const defaultRpcUrls = getDefaultRpcUrl(chain, rpcEndpoint);

  acc[chainId] = createPublicClient({
    chain: {
      ...chain,
      rpcUrls: {
        default: defaultRpcUrls,
      },
    },
    transport: defaultRpcUrls.webSocket ? webSocket() : http(),
  });

  return acc;
}, {} as Record<SupportedChainId, PublicClient>);

function getDefaultRpcUrl(
  chain: Chain,
  rpcEndpoint?: string
): Chain['rpcUrls']['default'] {
  if (!rpcEndpoint) {
    return chain.rpcUrls.default;
  }

  if (rpcEndpoint.startsWith('http')) {
    return {
      http: [rpcEndpoint],
    };
  }

  return {
    http: chain.rpcUrls.default.http,
    webSocket: [rpcEndpoint],
  };
}
