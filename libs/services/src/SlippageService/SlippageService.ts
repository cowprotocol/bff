import { PricePoint, SupportedChainId } from '@cowprotocol/repositories';
import { Address } from 'viem';

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

export interface VolatilityDetails {
  tokenAddress: string;
  usdPrice: number;
  prices: PricePoint[] | null;
  volatilityInUsd: number;
  volatilityInTokens: number;
}

export interface SlippageService {
  getSlippageBps(params: GetSlippageBpsParams): Promise<Bps>;
  getVolatilityDetails(
    chainId: SupportedChainId,
    tokenAddress: string
  ): Promise<VolatilityDetails | null>;
}

export const slippageServiceSymbol = Symbol.for('SlippageService');
