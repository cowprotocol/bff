import { SupportedChainId } from '@cowprotocol/cow-sdk';
import { AllChainIds, logger } from '@cowprotocol/shared';
import { Chain, createPublicClient, http, PublicClient, webSocket } from 'viem';
import {
  arbitrum,
  avalanche,
  base,
  bsc,
  gnosis,
  lens,
  mainnet,
  polygon,
  sepolia,
} from 'viem/chains';

const NETWORKS: Record<SupportedChainId, Chain> = {
  [SupportedChainId.MAINNET]: mainnet,
  [SupportedChainId.GNOSIS_CHAIN]: gnosis,
  [SupportedChainId.ARBITRUM_ONE]: arbitrum,
  [SupportedChainId.BASE]: base,
  [SupportedChainId.POLYGON]: polygon,
  [SupportedChainId.AVALANCHE]: avalanche,
  [SupportedChainId.LENS]: lens,
  [SupportedChainId.BNB]: bsc,
  [SupportedChainId.SEPOLIA]: sepolia,
};

let viemClients: Record<SupportedChainId, PublicClient> | undefined;

export function getViemClients(): Record<SupportedChainId, PublicClient> {
  if (viemClients) {
    return viemClients;
  }

  viemClients = AllChainIds.reduce<Record<SupportedChainId, PublicClient>>(
    (acc, chainId) => {
      const chain = NETWORKS[chainId];
      const envVarName = `RPC_URL_${chainId}`;
      const rpcEndpoint = process.env[envVarName];
      if (!rpcEndpoint) {
        logger.warn(
          `RPC_URL_${chainId} is not set. Using default RPC URL for ${chain.name}`
        );
      }
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
    },
    {} as Record<SupportedChainId, PublicClient>
  );

  return viemClients;
}

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
