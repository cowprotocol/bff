import {
  UsdRepository,
  UsdRepositoryCoingecko,
  usdRepositorySymbol,
} from '@cowprotocol/repositories';
import { Container } from 'inversify';
import {
  SlippageService,
  SlippageServiceImpl,
  slippageServiceSymbol,
} from '@cowprotocol/services';

export const apiContainer = new Container();

// Repositories
apiContainer
  .bind<UsdRepository>(usdRepositorySymbol)
  .to(UsdRepositoryCoingecko);

// Services
apiContainer
  .bind<SlippageService>(slippageServiceSymbol)
  .to(SlippageServiceImpl);
