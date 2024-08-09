import { SupportedChainId } from '@cowprotocol/repositories';

/**
 * BPS (Basis Points)
 */
export type Bps = number;

export interface GetSlippageBpsParams {
  chainId: SupportedChainId;
  quoteTokenAddress: string;
  baseTokenAddress: string;
  order?: OrderForSlippageCalculation;
}

export interface OrderForSlippageCalculation {
  orderKind: 'buy' | 'sell';
  partiallyFillable: boolean;
  sellAmount: string;
  buyAmount: string;
  expirationTimeInSeconds: number;
}

export interface SlippageService {
  getSlippageBps(params: GetSlippageBpsParams): Promise<Bps>;
}

export const slippageServiceSymbol = Symbol.for('SlippageService');
