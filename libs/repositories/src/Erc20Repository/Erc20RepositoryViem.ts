import { injectable } from 'inversify';
import NodeCache from 'node-cache';
import { Erc20, Erc20Repository } from './Erc20Repository';
import { SupportedChainId } from '../types';
import {
  Client,
  createPublicClient,
  erc20Abi,
  getAddress,
  http,
  PublicClient,
} from 'viem';
import { mainnet } from 'viem/chains';

export const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

@injectable()
export class Erc20RepositoryViem implements Erc20Repository {
  constructor(private viemClients: Record<SupportedChainId, PublicClient>) {}

  async get(chainId: SupportedChainId, tokenAddress: string): Promise<Erc20> {
    const viemClient = this.viemClients[chainId];

    const ercTokenParams = {
      address: getAddress(tokenAddress),
      abi: erc20Abi,
    };

    const [nameResult, symbolResult, decimalsResult] =
      await publicClient.multicall({
        contracts: [
          {
            ...ercTokenParams,
            functionName: 'name',
          },
          {
            ...ercTokenParams,
            functionName: 'symbol',
          },
          {
            ...ercTokenParams,
            functionName: 'decimals',
          },
        ],
      });

    const name =
      nameResult.status === 'success' ? nameResult.result : undefined;

    const symbol =
      symbolResult.status === 'success' ? symbolResult.result : undefined;

    const decimals =
      decimalsResult.status === 'success' ? decimalsResult.result : undefined;

    return {
      address: tokenAddress,
      name,
      symbol,
      decimals,
    };
  }
}
