import { SupportedChainId } from '@cowprotocol/cow-sdk';

export const erc20RepositorySymbol = Symbol.for('Erc20Repository');

export interface Erc20 {
  address: string;
  name?: string;
  symbol?: string;
  decimals?: number;
}

export interface Erc20Repository {
  /**
   * Return the ERC20 token information for the given address or null if the token address is not an ERC20 token for the given network.
   * @param chainId
   * @param tokenAddress
   */
  get(chainId: SupportedChainId, tokenAddress: string): Promise<Erc20 | null>;
}
