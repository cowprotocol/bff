import {
  getCacheRepository,
  getDuneRepository,
  getErc20Repository,
  getAffiliatesRepository,
  getPushNotificationsRepository,
  getPushSubscriptionsRepository,
  getSimulationRepository,
  getTokenBalancesRepository,
  getTokenHolderRepository,
  getUserBalanceRepository,
  getUsdRepository,
  TokenBalancesService,
  TokenBalancesServiceMain,
  tokenBalancesServiceSymbol,
  AffiliateProgramExportService,
  AffiliateProgramExportServiceImpl,
  affiliateProgramExportServiceSymbol,
} from '@cowprotocol/services';

import {
  AffiliatesRepository,
  affiliatesRepositorySymbol,
  CacheRepository,
  cacheRepositorySymbol,
  DuneRepository,
  duneRepositorySymbol,
  Erc20Repository,
  erc20RepositorySymbol,
  isCmsEnabled,
  isDuneEnabled,
  PushNotificationsRepository,
  pushNotificationsRepositorySymbol,
  PushSubscriptionsRepository,
  pushSubscriptionsRepositorySymbol,
  SimulationRepository,
  tenderlyRepositorySymbol,
  TokenBalancesRepository,
  tokenBalancesRepositorySymbol,
  TokenHolderRepository,
  UserBalanceRepository,
  userBalanceRepositorySymbol,
  tokenHolderRepositorySymbol,
  UsdRepository,
  usdRepositorySymbol,
} from '@cowprotocol/repositories';

import {
  HooksService,
  HooksServiceImpl,
  AffiliateStatsService,
  AffiliateStatsServiceImpl,
  affiliateStatsServiceSymbol,
  hooksServiceSymbol,
  SimulationService,
  SlippageService,
  SlippageServiceMain,
  TokenHolderService,
  TokenHolderServiceMain,
  UsdService,
  UsdServiceMain,
  simulationServiceSymbol,
  slippageServiceSymbol,
  tokenHolderServiceSymbol,
  usdServiceSymbol,
  BalanceTrackingService,
  BalanceTrackingServiceMain,
  SSEService,
  SSEServiceMain,
  balanceTrackingServiceSymbol,
  sseServiceSymbol,
} from '@cowprotocol/services';

import { Container } from 'inversify';
import { Logger, logger } from '@cowprotocol/shared';

const DEFAULT_AFFILIATE_STATS_CACHE_TTL_MS = 3600000;

function getAffiliateStatsCacheTtlMs(): number {
  const rawValue = process.env.DUNE_AFFILIATE_STATS_CACHE_TTL_MS;
  if (!rawValue) {
    return DEFAULT_AFFILIATE_STATS_CACHE_TTL_MS;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed < 0) {
    logger.warn(
      `Invalid DUNE_AFFILIATE_STATS_CACHE_TTL_MS value: ${rawValue}. Using default ${DEFAULT_AFFILIATE_STATS_CACHE_TTL_MS}ms.`
    );
    return DEFAULT_AFFILIATE_STATS_CACHE_TTL_MS;
  }

  return parsed;
}

function getApiContainer(): Container {
  const apiContainer = new Container();

  // Bind logger
  apiContainer.bind<Logger>('Logger').toConstantValue(logger);

  // Repositories
  const cacheRepository = getCacheRepository();
  const erc20Repository = getErc20Repository(cacheRepository);
  const simulationRepository = getSimulationRepository();
  const tokenHolderRepository = getTokenHolderRepository(cacheRepository);
  const tokenBalancesRepository = getTokenBalancesRepository();
  const userBalanceRepository = getUserBalanceRepository(cacheRepository);
  const usdRepository = getUsdRepository(cacheRepository, erc20Repository);
  const pushNotificationsRepository = getPushNotificationsRepository();
  const pushSubscriptionsRepository = getPushSubscriptionsRepository();
  const affiliatesRepository = getAffiliatesRepository();

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
    .toConstantValue(usdRepository);

  apiContainer
    .bind<PushNotificationsRepository>(pushNotificationsRepositorySymbol)
    .toConstantValue(pushNotificationsRepository);

  apiContainer
    .bind<PushSubscriptionsRepository>(pushSubscriptionsRepositorySymbol)
    .toConstantValue(pushSubscriptionsRepository);

  apiContainer
    .bind<AffiliatesRepository>(affiliatesRepositorySymbol)
    .toConstantValue(affiliatesRepository);

  apiContainer
    .bind<TokenHolderRepository>(tokenHolderRepositorySymbol)
    .toConstantValue(tokenHolderRepository);

  if (isDuneEnabled) {
    const duneRepository = getDuneRepository();
    const affiliateStatsCacheTtlMs = getAffiliateStatsCacheTtlMs();

    apiContainer
      .bind<DuneRepository>(duneRepositorySymbol)
      .toConstantValue(duneRepository);

    apiContainer
      .bind<HooksService>(hooksServiceSymbol)
      .toDynamicValue(() => new HooksServiceImpl(duneRepository));

    apiContainer
      .bind<AffiliateStatsService>(affiliateStatsServiceSymbol)
      .toDynamicValue(
        () => new AffiliateStatsServiceImpl(duneRepository, affiliateStatsCacheTtlMs)
      );
  }

  if (isDuneEnabled && isCmsEnabled) {
    const duneRepository = apiContainer.get<DuneRepository>(duneRepositorySymbol);
    apiContainer
      .bind<AffiliateProgramExportService>(affiliateProgramExportServiceSymbol)
      .toDynamicValue(
        () => new AffiliateProgramExportServiceImpl(affiliatesRepository, duneRepository)
      );
  }

  apiContainer
    .bind<TokenBalancesRepository>(tokenBalancesRepositorySymbol)
    .toConstantValue(tokenBalancesRepository);

  apiContainer
    .bind<UserBalanceRepository>(userBalanceRepositorySymbol)
    .toConstantValue(userBalanceRepository);

  // Services
  apiContainer
    .bind<SlippageService>(slippageServiceSymbol)
    .to(SlippageServiceMain);

  apiContainer
    .bind<TokenHolderService>(tokenHolderServiceSymbol)
    .to(TokenHolderServiceMain);

  apiContainer
    .bind<TokenBalancesService>(tokenBalancesServiceSymbol)
    .to(TokenBalancesServiceMain);

  apiContainer.bind<UsdService>(usdServiceSymbol).to(UsdServiceMain);

  apiContainer
    .bind<SimulationService>(simulationServiceSymbol)
    .to(SimulationService);

  apiContainer
    .bind<BalanceTrackingService>(balanceTrackingServiceSymbol)
    .to(BalanceTrackingServiceMain)
    .inSingletonScope();

  apiContainer
    .bind<SSEService>(sseServiceSymbol)
    .to(SSEServiceMain)
    .inSingletonScope();

  return apiContainer;
}

export const apiContainer = getApiContainer();
