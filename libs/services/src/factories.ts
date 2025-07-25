import 'reflect-metadata';

import {
  CacheRepository,
  CacheRepositoryMemory,
  CacheRepositoryRedis,
  Erc20Repository,
  Erc20RepositoryCache,
  Erc20RepositoryViem,
  IndexerStateRepository,
  IndexerStateRepositoryPostgres,
  // IndexerStateRepositoryTypeOrm,
  PushNotificationsRepository,
  PushNotificationsRepositoryRabbit,
  PushSubscriptionsRepository,
  PushSubscriptionsRepositoryCms,
  SimulationRepository,
  SimulationRepositoryTenderly,
  TelegramBot,
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
  createNewPostgresOrm,
  createTelegramBot,
  redisClient,
  getViemClients,
} from '@cowprotocol/repositories';
import { createNewPostgresPool } from '@cowprotocol/repositories';

import ms from 'ms';
import { Pool } from 'pg';
import { DataSource } from 'typeorm';
import { logger } from '@cowprotocol/shared';

const DEFAULT_CACHE_VALUE_SECONDS = ms('2min') / 1000; // 2min cache time by default for values
const DEFAULT_CACHE_NULL_SECONDS = ms('30min') / 1000; // 30min cache time by default for NULL values (when the repository isn't known)

const CACHE_TOKEN_INFO_SECONDS = ms('24h') / 1000; // 24h

// Singleton instances
let postgresPool: Pool | undefined = undefined;
let ormDataSource: DataSource | undefined = undefined;
let telegramBot: TelegramBot | undefined = undefined;

export function getErc20Repository(
  cacheRepository: CacheRepository
): Erc20Repository {
  return new Erc20RepositoryCache(
    new Erc20RepositoryViem(getViemClients()),
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
    new UsdRepositoryCow(cowApiClients, erc20Repository),
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

export function getPushNotificationsRepository(): PushNotificationsRepository {
  return new PushNotificationsRepositoryRabbit();
}

export function getPushSubscriptionsRepository(): PushSubscriptionsRepository {
  return new PushSubscriptionsRepositoryCms();
}

export function getPostgresPool(): Pool {
  if (!postgresPool) {
    postgresPool = createNewPostgresPool();
  }

  return postgresPool;
}

export function getOrmDataSource(): DataSource {
  if (!ormDataSource) {
    ormDataSource = createNewPostgresOrm();
    ormDataSource.initialize().catch((error) => {
      logger.error('Error initializing ORM data source', error);
      throw error;
    });
  }
  return ormDataSource;
}

export function getIndexerStateRepository(): IndexerStateRepository {
  const pool = getPostgresPool();
  return new IndexerStateRepositoryPostgres(pool);

  // const ormDataSource = getOrmDataSource();
  // return new IndexerStateRepositoryTypeOrm(ormDataSource);
}

export function getSimulationRepository(): SimulationRepository {
  return new SimulationRepositoryTenderly();
}

export function getTelegramBot(): TelegramBot {
  if (!telegramBot) {
    telegramBot = createTelegramBot();
  }

  return telegramBot;
}
