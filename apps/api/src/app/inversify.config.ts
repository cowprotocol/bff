import {
  UsdRepository,
  UsdRepositoryCoingecko,
  usdRepositorySymbol,
} from '@cowprotocol/repositories';

import { Container } from 'inversify';
import {
  SlippageService,
  SlippageServiceMain,
  UsdService,
  UsdServiceMain,
  slippageServiceSymbol,
  usdServiceSymbol,
} from '@cowprotocol/services';

export const apiContainer = new Container();

// Repositories
apiContainer
  .bind<UsdRepository>(usdRepositorySymbol)
  .to(UsdRepositoryCoingecko);

// Services
apiContainer
  .bind<SlippageService>(slippageServiceSymbol)
  .to(SlippageServiceMain);

apiContainer.bind<UsdService>(usdServiceSymbol).to(UsdServiceMain);
