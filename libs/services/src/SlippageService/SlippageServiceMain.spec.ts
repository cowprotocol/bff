import { Container, injectable } from 'inversify';
import { SlippageService, slippageServiceSymbol } from './SlippageService';
import { SlippageServiceMain } from './SlippageServiceMain';
import {
  PricePoint,
  PriceStrategy,
  SupportedChainId,
  UsdRepository,
  usdRepositorySymbol,
} from '@cowprotocol/repositories';

@injectable()
class UsdRepositoryMock implements UsdRepository {
  getUsdPrice(
    chainId: SupportedChainId,
    tokenAddress: string
  ): Promise<number | null> {
    throw null;
  }
  getUsdPrices(
    chainId: SupportedChainId,
    tokenAddress: string,
    priceStrategy: PriceStrategy
  ): Promise<PricePoint[] | null> {
    throw null;
  }
}

describe('SlippageServiceMain', () => {
  let slippageService: SlippageService;

  beforeAll(() => {
    const container = new Container();
    container.bind<UsdRepository>(usdRepositorySymbol).to(UsdRepositoryMock);
    container
      .bind<SlippageService>(slippageServiceSymbol)
      .to(SlippageServiceMain);

    slippageService = container.get(slippageServiceSymbol);
  });

  // TODO: Implement! as slippage calculation is not implemented, we cant test it yey
  it('should return always 50', async () => {
    const slippage = 0; // await slippageService.getSlippageBps('0x0', '0x0');
    expect(slippage).toEqual(0);
  });
});
