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

const DEFAULT_CACHE_VALUE_SECONDS = ms('2min') / 1000; // 2min cache time by default for values
const DEFAULT_CACHE_NULL_SECONDS = ms('30min') / 1000; // 30min cache time by default for NULL values (when the repository don't know)

import { Container } from 'inversify';
import {
  SlippageService,
  SlippageServiceMock,
  UsdService,
  UsdServiceMain,
  slippageServiceSymbol,
  usdServiceSymbol,
} from '@cowprotocol/services';
import ms from 'ms';

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
    'usdCow',
    DEFAULT_CACHE_VALUE_SECONDS,
    DEFAULT_CACHE_NULL_SECONDS
  );
}

function getUsdRepositoryCoingecko(
  cacheRepository: CacheRepository
): UsdRepository {
  return new UsdRepositoryCache(
    new UsdRepositoryCoingecko(),
    cacheRepository,
    'usdCoingecko',
    DEFAULT_CACHE_VALUE_SECONDS,
    DEFAULT_CACHE_NULL_SECONDS
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
