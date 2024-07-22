/**
 * BPS (Basis Points)
 */
export type Bps = number;

export interface SlippageService {
  getSlippageBps(
    quoteTokenAddress: string,
    baseTokenAddress: string
  ): Promise<Bps>;
}

export const slippageServiceSymbol = Symbol.for('SlippageService');
