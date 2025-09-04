import { injectable } from 'inversify';
import {
  COW_PROTOCOL_VAULT_RELAYER_ADDRESS,
  SupportedChainId,
} from '@cowprotocol/cow-sdk';
import { erc20Abi, getAddress, PublicClient } from 'viem';

import {
  UserBalanceRepository,
  UserTokenBalance,
} from './UserBalanceRepository';

@injectable()
export class UserBalanceRepositoryViem implements UserBalanceRepository {
  constructor(private viemClients: Record<SupportedChainId, PublicClient>) {}

  async getUserTokenBalances(
    chainId: SupportedChainId,
    userAddress: string,
    tokenAddresses: string[]
  ): Promise<UserTokenBalance[]> {
    const viemClient = this.viemClients[chainId];
    const userAddressHex = getAddress(userAddress);
    const vaultRelayerAddress = getAddress(
      COW_PROTOCOL_VAULT_RELAYER_ADDRESS[chainId]
    );

    const contracts = tokenAddresses.flatMap((tokenAddress) => {
      const tokenAddressHex = getAddress(tokenAddress);
      return [
        {
          address: tokenAddressHex,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [userAddressHex],
        },
        {
          address: tokenAddressHex,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [userAddressHex, vaultRelayerAddress],
        },
        {
          address: tokenAddressHex,
          abi: erc20Abi,
          functionName: 'decimals', // TODO: Will remove and use ERC20Repository
        },
        {
          address: tokenAddressHex,
          abi: erc20Abi,
          functionName: 'symbol', // TODO: Will remove and use ERC20Repository
        },
        {
          address: tokenAddressHex,
          abi: erc20Abi,
          functionName: 'name', // TODO: Will remove and use ERC20Repository
        },
      ];
    });

    // TODO: We should probably have an alternative implementations using services that gets this information already for us like Moralis
    // TODO: We need to batch the calls (it might be a loooong list of tokens)
    const results = await viemClient.multicall({
      contracts,
    });

    const balances: UserTokenBalance[] = [];

    for (let i = 0; i < tokenAddresses.length; i++) {
      const baseIndex = i * 5;
      const balanceResult = results[baseIndex];
      const allowanceResult = results[baseIndex + 1];
      const decimalsResult = results[baseIndex + 2];
      const symbolResult = results[baseIndex + 3];
      const nameResult = results[baseIndex + 4];

      // TODO: Improve the error handling. This implementation drops from the result tokens where the RPC fails, which can happen. It should re-attempt or/and return the errors
      if (
        balanceResult.status === 'success' &&
        decimalsResult.status === 'success' &&
        allowanceResult.status === 'success' &&
        symbolResult.status === 'success' &&
        nameResult.status === 'success'
      ) {
        balances.push({
          tokenAddress: tokenAddresses[i],
          balance: balanceResult.result.toString(),
          allowance: allowanceResult.result.toString(),
          decimals: Number(decimalsResult.result),
          symbol: String(symbolResult.result),
          name: String(nameResult.result),
        });
      }
    }

    return balances;
  }
}
