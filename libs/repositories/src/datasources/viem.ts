import { AllChainIds } from '@cowprotocol/shared';
import { SupportedChainId } from '@cowprotocol/cow-sdk';
import { Chain, createPublicClient, http, PublicClient, webSocket } from 'viem';
import {
  arbitrum,
  base,
  gnosis,
  mainnet,
  sepolia,
  polygon,
  avalanche,
} from 'viem/chains';

const NETWORKS: Record<SupportedChainId, Chain> = {
  [SupportedChainId.MAINNET]: mainnet,
  [SupportedChainId.GNOSIS_CHAIN]: gnosis,
  [SupportedChainId.ARBITRUM_ONE]: arbitrum,
  [SupportedChainId.BASE]: base,
  [SupportedChainId.POLYGON]: polygon,
  [SupportedChainId.AVALANCHE]: avalanche,
  [SupportedChainId.SEPOLIA]: sepolia,
};

export const viemClients = AllChainIds.reduce<
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
