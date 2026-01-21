import {
  getCacheRepository,
  getDuneRepository,
  getErc20Repository,
  getPushNotificationsRepository,
  getPushSubscriptionsRepository,
  getSimulationRepository,
  getTokenBalancesRepository,
  getTokenHolderRepository,
  getUsdRepository,
  TokenBalancesService,
  TokenBalancesServiceMain,
  tokenBalancesServiceSymbol,
} from '@cowprotocol/services';

import {
  CacheRepository,
  cacheRepositorySymbol,
  DuneRepository,
  duneRepositorySymbol,
  Erc20Repository,
  erc20RepositorySymbol,
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
  tokenHolderRepositorySymbol,
  UsdRepository,
  usdRepositorySymbol,
} from '@cowprotocol/repositories';

import {
  HooksService,
  HooksServiceImpl,
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
} from '@cowprotocol/services';

import { Container } from 'inversify';
import { Logger, logger } from '@cowprotocol/shared';

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
  const usdRepository = getUsdRepository(cacheRepository, erc20Repository);
  const pushNotificationsRepository = getPushNotificationsRepository();
  const pushSubscriptionsRepository = getPushSubscriptionsRepository();

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
    .bind<TokenHolderRepository>(tokenHolderRepositorySymbol)
    .toConstantValue(tokenHolderRepository);

  if (isDuneEnabled) {
    const duneRepository = getDuneRepository();

    apiContainer
      .bind<DuneRepository>(duneRepositorySymbol)
      .toConstantValue(duneRepository);

    apiContainer
      .bind<HooksService>(hooksServiceSymbol)
      .toDynamicValue(() => new HooksServiceImpl(duneRepository));
  }

  apiContainer
    .bind<TokenBalancesRepository>(tokenBalancesRepositorySymbol)
    .toConstantValue(tokenBalancesRepository);

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

  return apiContainer;
}

export const apiContainer = getApiContainer();
