import {
  CacheRepository,
  CacheRepositoryMemory,
  CacheRepositoryRedis,
  Erc20Repository,
  Erc20RepositoryCache,
  Erc20RepositoryViem,
  SimulationRepository,
  SimulationRepositoryTenderly,
  TokenHolderRepository,
  TokenHolderRepositoryCache,
  TokenHolderRepositoryEthplorer,
  TokenHolderRepositoryFallback,
  TokenHolderRepositoryMoralis,
  UsdRepository,
  UsdRepositoryCache,
  UsdRepositoryCoingecko,
  UsdRepositoryCow,
  UsdRepositoryFallback,
  cowApiClients,
  redisClient,
  viemClients,
} from '@cowprotocol/repositories';
import { logger } from '@cowprotocol/shared';

import ms from 'ms';

const DEFAULT_CACHE_VALUE_SECONDS = ms('2min') / 1000; // 2min cache time by default for values
const DEFAULT_CACHE_NULL_SECONDS = ms('30min') / 1000; // 30min cache time by default for NULL values (when the repository isn't known)

const CACHE_TOKEN_INFO_SECONDS = ms('24h') / 1000; // 24h

export function getErc20Repository(
  cacheRepository: CacheRepository
): Erc20Repository {
  return new Erc20RepositoryCache(
    new Erc20RepositoryViem(viemClients),
    cacheRepository,
    'erc20',
    CACHE_TOKEN_INFO_SECONDS
  );
}

export function getCacheRepository(): CacheRepository {
  if (redisClient) {
    return new CacheRepositoryRedis(redisClient);
  }

  return new CacheRepositoryMemory();
}

export function getUsdRepositoryCow(
  cacheRepository: CacheRepository,
  erc20Repository: Erc20Repository
): UsdRepository {
  return new UsdRepositoryCache(
    new UsdRepositoryCow(
      cowApiClients,
      erc20Repository,
      logger.child({ module: 'usd-cow' })
    ),
    cacheRepository,
    'usdCow',
    DEFAULT_CACHE_VALUE_SECONDS,
    DEFAULT_CACHE_NULL_SECONDS
  );
}

export function getUsdRepositoryCoingecko(
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

export function getUsdRepository(
  cacheRepository: CacheRepository,
  erc20Repository: Erc20Repository
): UsdRepository {
  return new UsdRepositoryFallback([
    getUsdRepositoryCoingecko(cacheRepository),
    getUsdRepositoryCow(cacheRepository, erc20Repository),
  ]);
}

export function getTokenHolderRepositoryEthplorer(
  cacheRepository: CacheRepository
): TokenHolderRepository {
  return new TokenHolderRepositoryCache(
    new TokenHolderRepositoryEthplorer(),
    cacheRepository,
    'tokenHolderEthplorer',
    DEFAULT_CACHE_VALUE_SECONDS,
    DEFAULT_CACHE_NULL_SECONDS
  );
}

export function getTokenHolderRepositoryMoralis(
  cacheRepository: CacheRepository
): TokenHolderRepository {
  return new TokenHolderRepositoryCache(
    new TokenHolderRepositoryMoralis(),
    cacheRepository,
    'tokenHolderMoralis',
    DEFAULT_CACHE_VALUE_SECONDS,
    DEFAULT_CACHE_NULL_SECONDS
  );
}

export function getTokenHolderRepository(
  cacheRepository: CacheRepository
): TokenHolderRepository {
  return new TokenHolderRepositoryFallback([
    getTokenHolderRepositoryMoralis(cacheRepository),
    getTokenHolderRepositoryEthplorer(cacheRepository),
  ]);
}

export function getSimulationRepository(): SimulationRepository {
  return new SimulationRepositoryTenderly(logger.child({ module: 'tenderly' }));
}
