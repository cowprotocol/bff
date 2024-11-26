import ms from 'ms';
import { PublicClient } from 'viem';
import { Container } from 'inversify';

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
  cacheRepositorySymbol,
  cowApiClients,
  erc20RepositorySymbol,
  redisClient,
  tenderlyRepositorySymbol,
  tokenHolderRepositorySymbol,
  usdRepositorySymbol,
  viemClients,
} from '@cowprotocol/repositories';

import {
  SimulationService,
  SlippageService,
  SlippageServiceMain,
  TokenHolderService,
  TokenHolderServiceMain,
  TradingService,
  UsdService,
  UsdServiceMain,
  simulationServiceSymbol,
  slippageServiceSymbol,
  tokenHolderServiceSymbol,
  usdServiceSymbol,
  tradingServiceSymbol
} from '@cowprotocol/services';
import { SupportedChainId } from '@cowprotocol/cow-sdk';

const DEFAULT_CACHE_VALUE_SECONDS = ms('2min') / 1000; // 2min cache time by default for values
const DEFAULT_CACHE_NULL_SECONDS = ms('30min') / 1000; // 30min cache time by default for NULL values (when the repository isn't known)

const CACHE_TOKEN_INFO_SECONDS = ms('24h') / 1000; // 24h

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

function getTokenHolderRepositoryEthplorer(
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

function getTokenHolderRepositoryMoralis(
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

function getTokenHolderRepository(
  cacheRepository: CacheRepository
): TokenHolderRepository {
  return new TokenHolderRepositoryFallback([
    getTokenHolderRepositoryMoralis(cacheRepository),
    getTokenHolderRepositoryEthplorer(cacheRepository),
  ]);
}

function getTradingService(
  erc20Repository: Erc20Repository
): TradingService {
  return new TradingService(erc20Repository, viemClients as Record<SupportedChainId, PublicClient>);
}

function getApiContainer(): Container {
  const apiContainer = new Container();
  // Repositories
  const cacheRepository = getCacheRepository(apiContainer);
  const erc20Repository = getErc20Repository(cacheRepository);
  const simulationRepository = new SimulationRepositoryTenderly();
  const tokenHolderRepository = getTokenHolderRepository(cacheRepository);
  const tradingService = getTradingService(erc20Repository)

  apiContainer
    .bind<Erc20Repository>(erc20RepositorySymbol)
    .toConstantValue(erc20Repository);

  apiContainer
    .bind<SimulationRepository>(tenderlyRepositorySymbol)
    .toConstantValue(simulationRepository);

  apiContainer
    .bind<CacheRepository>(cacheRepositorySymbol)
    .toConstantValue(cacheRepository);

  apiContainer
    .bind<UsdRepository>(usdRepositorySymbol)
    .toConstantValue(getUsdRepository(cacheRepository, erc20Repository));

  apiContainer
    .bind<TokenHolderRepository>(tokenHolderRepositorySymbol)
    .toConstantValue(tokenHolderRepository);

  // Services
  apiContainer
    .bind<SlippageService>(slippageServiceSymbol)
    .to(SlippageServiceMain);

  apiContainer
    .bind<TokenHolderService>(tokenHolderServiceSymbol)
    .to(TokenHolderServiceMain);

  apiContainer.bind<UsdService>(usdServiceSymbol).to(UsdServiceMain);

  apiContainer
    .bind<SimulationService>(simulationServiceSymbol)
    .to(SimulationService);

  apiContainer
    .bind<TradingService>(tradingServiceSymbol)
    .toConstantValue(tradingService);

  return apiContainer;
}

export const apiContainer = getApiContainer();
