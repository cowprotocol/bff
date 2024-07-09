/**
 * BPS (Basis Points)
 */
export type Bps = number;

export interface SlippageService {
  getSlippageBps(quoteTokenAddress: string, baseTokenAddress: string): Bps;
}

// TODO: Find good name for the implementation, as Leandro don't like "Impl" suffix, just don't want to couple it to add Coingecko in its name (as that would couple it to the data-source, and the adding a name to specify the algorithm might complicate the name, as this will use some custom logic based on standard deviation, so for now as we plan to have just one implementation, I want to keep it simple. But happy to get ideas here)
export class SlippageServiceImpl implements SlippageService {
  getSlippageBps(_quoteTokenAddress: string, _baseTokenAddress: string): Bps {
    return 50;
  }
}

// TODO: This is just temporal! I will introduce a IoC framework in a follow up
export function getSlippageService(): SlippageService {
  return new SlippageServiceImpl();
}
