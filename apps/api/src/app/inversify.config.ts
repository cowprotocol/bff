import {
  CacheRepository,
  CacheRepositoryMemory,
  CacheRepositoryRedis,
  CacheRepositoryFactory,
  Erc20Repository,
  Erc20RepositoryViem,
  FallbackRepositoryFactory,
  SimulationRepositoryTenderly,
  TokenHolderRepository,
  TokenHolderRepositoryEthplorer,
  TokenHolderRepositoryGoldRush,
  UsdRepository,
  UsdRepositoryCoingecko,
  UsdRepositoryCow,
  cacheRepositorySymbol,
  cowApiClients,
  erc20RepositorySymbol,
  redisClient,
  tenderlyRepositorySymbol,
  tokenHolderRepositorySymbol,
  usdRepositorySymbol,
  viemClients,
  serializePricePoints,
  deserializePricePoints,
  TokenHolderPoint,
  SimulationRepository,
} from '@cowprotocol/repositories';

const DEFAULT_CACHE_VALUE_SECONDS = ms('2min') / 1000; // 2min cache time by default for values
const DEFAULT_CACHE_NULL_SECONDS = ms('30min') / 1000; // 30min cache time by default for NULL values (when the repository isn't known)

const CACHE_TOKEN_INFO_SECONDS = ms('24h') / 1000; // 24h

import { Container } from 'inversify';
import {
  SlippageService,
  SlippageServiceMain,
  SimulationService,
  TokenHolderService,
  TokenHolderServiceMain,
  UsdService,
  UsdServiceMain,
  slippageServiceSymbol,
  simulationServiceSymbol,
  tokenHolderServiceSymbol,
  usdServiceSymbol,
} from '@cowprotocol/services';
import ms from 'ms';

function getErc20Repository(cacheRepository: CacheRepository): Erc20Repository {
  return CacheRepositoryFactory.create<Erc20Repository>(
    new Erc20RepositoryViem(viemClients),
    cacheRepository,
    'erc20',
    CACHE_TOKEN_INFO_SECONDS,
    CACHE_TOKEN_INFO_SECONDS,
    {
      get: {
        serialize: (data) => JSON.stringify(data),
        deserialize: (data) => JSON.parse(data),
      },
    }
  );
}

function getCacheRepository(_apiContainer: Container): CacheRepository {
  if (redisClient) {
    return new CacheRepositoryRedis(redisClient);
  }

  return new CacheRepositoryMemory();
}

const usdPriceConvertFns = {
  getUsdPrice: {
    serialize: (data: number) => data.toString(),
    deserialize: parseFloat,
  },
  getUsdPrices: {
    serialize: serializePricePoints,
    deserialize: deserializePricePoints,
  },
};

function getUsdRepositoryCow(
  cacheRepository: CacheRepository,
  erc20Repository: Erc20Repository
): UsdRepository {
  return CacheRepositoryFactory.create<UsdRepository>(
    new UsdRepositoryCow(cowApiClients, erc20Repository),
    cacheRepository,
    'usdCow',
    DEFAULT_CACHE_VALUE_SECONDS,
    DEFAULT_CACHE_NULL_SECONDS,
    usdPriceConvertFns
  );
}

function getUsdRepositoryCoingecko(
  cacheRepository: CacheRepository
): UsdRepository {
  return CacheRepositoryFactory.create<UsdRepository>(
    new UsdRepositoryCoingecko(),
    cacheRepository,
    'usdCoingecko',
    DEFAULT_CACHE_VALUE_SECONDS,
    DEFAULT_CACHE_NULL_SECONDS,
    usdPriceConvertFns
  );
}

function getUsdRepository(
  cacheRepository: CacheRepository,
  erc20Repository: Erc20Repository
): UsdRepository {
  return FallbackRepositoryFactory.create<UsdRepository>([
    getUsdRepositoryCoingecko(cacheRepository),
    getUsdRepositoryCow(cacheRepository, erc20Repository),
  ]);
}

const tokenHolderConvertFns = {
  getTopTokenHolders: {
    serialize: (data: TokenHolderPoint[]) => JSON.stringify(data),
    deserialize: (data: string) => JSON.parse(data),
  },
};

function getTokenHolderRepositoryGoldRush(
  cacheRepository: CacheRepository
): TokenHolderRepository {
  return CacheRepositoryFactory.create<TokenHolderRepository>(
    new TokenHolderRepositoryGoldRush(),
    cacheRepository,
    'tokenHolderGoldRush',
    CACHE_TOKEN_INFO_SECONDS,
    DEFAULT_CACHE_NULL_SECONDS,
    tokenHolderConvertFns
  );
}

function getTokenHolderRepositoryEthplorer(
  cacheRepository: CacheRepository
): TokenHolderRepository {
  return CacheRepositoryFactory.create<TokenHolderRepository>(
    new TokenHolderRepositoryEthplorer(),
    cacheRepository,
    'tokenHolderEthplorer',
    CACHE_TOKEN_INFO_SECONDS,
    DEFAULT_CACHE_NULL_SECONDS,
    tokenHolderConvertFns
  );
}

function getTokenHolderRepository(cacheRepository: CacheRepository) {
  return FallbackRepositoryFactory.create<TokenHolderRepository>([
    getTokenHolderRepositoryGoldRush(cacheRepository),
    getTokenHolderRepositoryEthplorer(cacheRepository),
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
    .bind<SimulationRepository>(tenderlyRepositorySymbol)
    .toConstantValue(new SimulationRepositoryTenderly());

  apiContainer
    .bind<CacheRepository>(cacheRepositorySymbol)
    .toConstantValue(cacheRepository);

  apiContainer
    .bind<UsdRepository>(usdRepositorySymbol)
    .toConstantValue(getUsdRepository(cacheRepository, erc20Repository));

  apiContainer
    .bind<TokenHolderRepository>(tokenHolderRepositorySymbol)
    .toConstantValue(getTokenHolderRepository(cacheRepository));

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

  return apiContainer;
}

export const apiContainer = getApiContainer();
