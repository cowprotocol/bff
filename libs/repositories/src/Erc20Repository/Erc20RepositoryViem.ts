import { injectable } from 'inversify';
import { Erc20, Erc20Repository } from './Erc20Repository';
import { SupportedChainId } from '../types';
import { erc20Abi, getAddress, PublicClient } from 'viem';

@injectable()
export class Erc20RepositoryViem implements Erc20Repository {
  constructor(private viemClients: Record<SupportedChainId, PublicClient>) {}

  async get(
    chainId: SupportedChainId,
    tokenAddress: string
  ): Promise<Erc20 | null> {
    const viemClient = this.viemClients[chainId];
    const tokenAddressHex = getAddress(tokenAddress);

    // If the address has no code, we return null
    const code = await viemClient.getCode({ address: tokenAddressHex });
    if (!code) {
      return null;
    }

    const ercTokenParams = {
      address: tokenAddressHex,
      abi: erc20Abi,
    };

    const [nameResult, symbolResult, decimalsResult] =
      await viemClient.multicall({
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
