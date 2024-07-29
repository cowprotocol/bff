import { SupportedChainId } from '../types';

export const erc20RepositorySymbol = Symbol.for('Erc20Repository');

export interface Erc20 {
  address: string;
  name?: string;
  symbol?: string;
  decimals?: number;
}

export interface Erc20Repository {
  get(chainId: SupportedChainId, tokenAddress: string): Promise<Erc20>;
}
