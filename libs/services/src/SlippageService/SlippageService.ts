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

export type OrderKind = 'buy' | 'sell';

export interface OrderForSlippageCalculation {
  orderKind: OrderKind;
  partiallyFillable: boolean;
  sellAmount: string;
  buyAmount: string;
  expirationTimeInSeconds: number;
}

export interface SlippageService {
  getSlippageBps(params: GetSlippageBpsParams): Promise<Bps>;
}

export const slippageServiceSymbol = Symbol.for('SlippageService');
