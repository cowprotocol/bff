import { PricePoint } from '@cowprotocol/repositories';
import { SupportedChainId } from '@cowprotocol/cow-sdk';

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

export interface PairVolatility
  extends Omit<
    VolatilityDetails,
    'tokenAddress' | 'usdPrice' | 'volatilityInUsd'
  > {
  baseTokenAddress: string;
  quoteTokenAddress: string;
}

export interface SlippageService {
  getSlippageBps(params: GetSlippageBpsParams): Promise<Bps>;
  getVolatilityDetails(
    chainId: SupportedChainId,
    tokenAddress: string
  ): Promise<VolatilityDetails | null>;
  getVolatilityForPair(
    chainId: SupportedChainId,
    baseTokenAddress: string,
    quoteTokenAddress: string
  ): Promise<PairVolatility | null>;
}

export const slippageServiceSymbol = Symbol.for('SlippageService');
