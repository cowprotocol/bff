import 'reflect-metadata';

import { Container, injectable } from 'inversify';
import {
  SlippageService,
  SlippageServiceImpl,
  slippageServiceSymbol,
} from './SlippageService';
import { UsdRepository, usdRepositorySymbol } from '@cowprotocol/repositories';

@injectable()
class UsdRepositoryMock implements UsdRepository {
  async getDailyUsdPrice(_tokenAddress: string, _date: Date): Promise<number> {
    return 1234;
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
