import { lens as lensCoWSdk, SupportedChainId } from '@cowprotocol/cow-sdk';
import { AllChainIds, logger } from '@cowprotocol/shared';
import {
  Chain,
  ChainContract,
  createPublicClient,
  http,
  PublicClient,
  webSocket,
} from 'viem';
import {
  arbitrum,
  avalanche,
  base,
  bsc,
  gnosis,
  lens,
  linea,
  mainnet,
  plasma,
  polygon,
  sepolia,
  ink,
} from 'viem/chains';

const NETWORKS = {
  [SupportedChainId.MAINNET]: mainnet,
  [SupportedChainId.GNOSIS_CHAIN]: gnosis,
  [SupportedChainId.ARBITRUM_ONE]: arbitrum,
  [SupportedChainId.BASE]: base,
  [SupportedChainId.POLYGON]: polygon,
  [SupportedChainId.AVALANCHE]: avalanche,
  [SupportedChainId.LENS]: {
    ...lens,
    contracts: {
      ...lens.contracts,
      multicall3: lensCoWSdk.contracts.multicall3 as ChainContract,
    },
  },
  [SupportedChainId.BNB]: bsc,
  [SupportedChainId.SEPOLIA]: sepolia,
  [SupportedChainId.LINEA]: linea,
  [SupportedChainId.PLASMA]: plasma,
  [SupportedChainId.INK]: ink,
} as const satisfies Record<SupportedChainId, Chain>;

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
        transport: defaultRpcUrls.webSocket
          ? webSocket(undefined, {
            retryDelay: 5_000, // 5sec
            retryCount: 3,
            reconnect: true,
          })
          : http(),
      }) as PublicClient;

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
