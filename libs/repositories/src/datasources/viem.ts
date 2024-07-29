import { createPublicClient, http, Client, Chain, PublicClient } from 'viem';
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
  acc[chainId] = createPublicClient({
    chain: NETWORKS[chainId],
    transport: http(),
  });

  return acc;
}, {} as Record<SupportedChainId, PublicClient>);
