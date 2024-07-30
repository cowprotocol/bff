import {
  CacheRepository,
  CacheRepositoryMemory,
  CacheRepositoryRedis,
  Erc20Repository,
  Erc20RepositoryCache,
  Erc20RepositoryViem,
  UsdRepository,
  UsdRepositoryCache,
  UsdRepositoryCoingecko,
  UsdRepositoryCow,
  UsdRepositoryFallback,
  cacheRepositorySymbol,
  cowApiClients,
  erc20RepositorySymbol,
  redisClient,
  usdRepositorySymbol,
  viemClients,
} from '@cowprotocol/repositories';

const DEFAULT_CACHE_VALUE_SECONDS = ms('2min') / 1000; // 2min cache time by default for values
const DEFAULT_CACHE_NULL_SECONDS = ms('30min') / 1000; // 30min cache time by default for NULL values (when the repository don't know)

const CACHE_TOKEN_INFO_SECONDS = ms('24h') / 1000; // 24h

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

function getErc20Repository(cacheRepository: CacheRepository): Erc20Repository {
  return new Erc20RepositoryCache(
    new Erc20RepositoryViem(viemClients),
    cacheRepository,
    'erc20',
    CACHE_TOKEN_INFO_SECONDS
  );
}

function getCacheRepository(_apiContainer: Container): CacheRepository {
  if (redisClient) {
    return new CacheRepositoryRedis(redisClient);
  }

  return new CacheRepositoryMemory();
}

function getUsdRepositoryCow(
  cacheRepository: CacheRepository,
  erc20Repository: Erc20Repository
): UsdRepository {
  return new UsdRepositoryCache(
    new UsdRepositoryCow(cowApiClients, erc20Repository),
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

function getUsdRepository(
  cacheRepository: CacheRepository,
  erc20Repository: Erc20Repository
): UsdRepository {
  return new UsdRepositoryFallback([
    getUsdRepositoryCoingecko(cacheRepository),
    getUsdRepositoryCow(cacheRepository, erc20Repository),
  ]);
}

function getApiContainer(): Container {
  const apiContainer = new Container();
  // Repositories
  const cacheRepository = getCacheRepository(apiContainer);
  const erc20Repository = getErc20Repository(cacheRepository);

  apiContainer
    .bind<Erc20Repository>(erc20RepositorySymbol)
    .toConstantValue(erc20Repository);

  apiContainer
    .bind<CacheRepository>(cacheRepositorySymbol)
    .toConstantValue(cacheRepository);

  apiContainer
    .bind<UsdRepository>(usdRepositorySymbol)
    .toConstantValue(getUsdRepository(cacheRepository, erc20Repository));

  // Services
  apiContainer
    .bind<SlippageService>(slippageServiceSymbol)
    .to(SlippageServiceMock);

  apiContainer.bind<UsdService>(usdServiceSymbol).to(UsdServiceMain);

  return apiContainer;
}

export const apiContainer = getApiContainer();
