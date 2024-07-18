import {
  UsdRepository,
  UsdRepositoryCoingecko,
  UsdRepositoryCow,
  UsdRepositoryFallback,
  UsdRepositoryRedis,
  redisClient,
  usdRepositorySymbol,
} from '@cowprotocol/repositories';

import { Container } from 'inversify';
import {
  SlippageService,
  SlippageServiceMock,
  UsdService,
  UsdServiceMain,
  slippageServiceSymbol,
  usdServiceSymbol,
} from '@cowprotocol/services';

function getTokenDecimals(tokenAddress: string): number | null {
  return 18; // TODO: Implement!!!
}

function getUsdRepositoryCow(): UsdRepository {
  const usdRepositoryCow = new UsdRepositoryCow(getTokenDecimals);

  if (!redisClient) {
    return usdRepositoryCow;
  }

  return new UsdRepositoryRedis(usdRepositoryCow, redisClient, 'usdCow');
}

function getUsdRepositoryCoingecko(): UsdRepository {
  const usdRepositoryCoingecko = new UsdRepositoryCow(getTokenDecimals);

  if (!redisClient) {
    return usdRepositoryCoingecko;
  }

  return new UsdRepositoryRedis(
    usdRepositoryCoingecko,
    redisClient,
    'usdCoingecko'
  );
}

function getUsdRepository(): UsdRepository {
  return new UsdRepositoryFallback([
    getUsdRepositoryCoingecko(),
    getUsdRepositoryCow(),
  ]);
}

function getApiContainer(): Container {
  const apiContainer = new Container();
  // Repositories
  apiContainer
    .bind<UsdRepository>(usdRepositorySymbol)
    .toConstantValue(getUsdRepository());

  // Services
  apiContainer
    .bind<SlippageService>(slippageServiceSymbol)
    .to(SlippageServiceMock);

  apiContainer.bind<UsdService>(usdServiceSymbol).to(UsdServiceMain);

  return apiContainer;
}

export const apiContainer = getApiContainer();
