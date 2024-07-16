import { Container, injectable } from 'inversify';
import {
  SlippageService,
  SlippageServiceImpl,
  slippageServiceSymbol,
} from './SlippageService';
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

describe('SlippageService', () => {
  let slippageService: SlippageService;

  beforeAll(() => {
    const container = new Container();
    container.bind<UsdRepository>(usdRepositorySymbol).to(UsdRepositoryMock);
    container
      .bind<SlippageService>(slippageServiceSymbol)
      .to(SlippageServiceImpl);

    slippageService = container.get(slippageServiceSymbol);
  });

  it('should return always 0', async () => {
    expect(await slippageService.getSlippageBps('0x0', '0x0')).toEqual(0);
  });
});
