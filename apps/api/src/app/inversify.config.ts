import {
  CacheRepository,
  CacheRepositoryMemory,
  CacheRepositoryRedis,
  UsdRepository,
  UsdRepositoryCache,
  UsdRepositoryCoingecko,
  UsdRepositoryCow,
  UsdRepositoryFallback,
  cacheRepositorySymbol,
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

function getCacheRepository(_apiContainer: Container): CacheRepository {
  if (redisClient) {
    return new CacheRepositoryRedis(redisClient);
  }

  return new CacheRepositoryMemory();
}

function getUsdRepositoryCow(cacheRepository: CacheRepository): UsdRepository {
  return new UsdRepositoryCache(
    new UsdRepositoryCow(getTokenDecimals),
    cacheRepository,
    'usdCow'
  );
}

function getUsdRepositoryCoingecko(
  cacheRepository: CacheRepository
): UsdRepository {
  return new UsdRepositoryCache(
    new UsdRepositoryCoingecko(),
    cacheRepository,
    'usdCoingecko'
  );
}

function getUsdRepository(cacheRepository: CacheRepository): UsdRepository {
  return new UsdRepositoryFallback([
    getUsdRepositoryCoingecko(cacheRepository),
    getUsdRepositoryCow(cacheRepository),
  ]);
}

function getApiContainer(): Container {
  const apiContainer = new Container();

  // Repositories
  const cacheRepository = getCacheRepository(apiContainer);
  apiContainer
    .bind<CacheRepository>(cacheRepositorySymbol)
    .toConstantValue(cacheRepository);

  apiContainer
    .bind<UsdRepository>(usdRepositorySymbol)
    .toConstantValue(getUsdRepository(cacheRepository));

  // Services
  apiContainer
    .bind<SlippageService>(slippageServiceSymbol)
    .to(SlippageServiceMock);

  apiContainer.bind<UsdService>(usdServiceSymbol).to(UsdServiceMain);

  return apiContainer;
}

export const apiContainer = getApiContainer();
