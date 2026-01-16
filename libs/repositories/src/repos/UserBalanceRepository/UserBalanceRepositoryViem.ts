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
import { logger } from '@cowprotocol/shared';

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
      ];
    });

    // TODO: We need to batch the calls (it might be a loooong list of tokens)
    const t0 = Date.now();
    logger.info(
      { contracts },
      '[UserBalanceRepositoryViem:getUserTokenBalances:debug99] multicall: start'
    );
    const results = await viemClient.multicall({
      contracts,
    });
    logger.info(
      { ms: Date.now() - t0, n: results.length },
      '[UserBalanceRepositoryViem:getUserTokenBalances:debug99] multicall: done'
    );

    const balances: UserTokenBalance[] = [];

    for (let i = 0; i < tokenAddresses.length; i++) {
      const baseIndex = i * 2;
      const balanceResult = results[baseIndex];
      const allowanceResult = results[baseIndex + 1];
      const tokenAddress = getAddress(tokenAddresses[i]);

      // TODO: Improve the error handling. This implementation drops from the result tokens where the RPC fails, which can happen. It should re-attempt or/and return the errors
      if (
        balanceResult.status === 'success' &&
        allowanceResult.status === 'success'
      ) {
        balances.push({
          tokenAddress,
          balance: balanceResult.result.toString(),
          allowance: allowanceResult.result.toString(),
        });
      }
    }

    return balances;
  }
}
