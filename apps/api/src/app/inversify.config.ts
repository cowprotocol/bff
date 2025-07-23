import {
  getCacheRepository,
  getDuneRepository,
  getErc20Repository,
  getPushNotificationsRepository,
  getPushSubscriptionsRepository,
  getSimulationRepository,
  getTokenHolderRepository,
  getUsdRepository,
} from '@cowprotocol/services';

import {
  CacheRepository,
  DuneRepository,
  Erc20Repository,
  PushNotificationsRepository,
  PushSubscriptionsRepository,
  SimulationRepository,
  TokenHolderRepository,
  UsdRepository,
  cacheRepositorySymbol,
  duneRepositorySymbol,
  erc20RepositorySymbol,
  pushNotificationsRepositorySymbol,
  pushSubscriptionsRepositorySymbol,
  tenderlyRepositorySymbol,
  tokenHolderRepositorySymbol,
  usdRepositorySymbol,
} from '@cowprotocol/repositories';

import {
  HooksService,
  HooksServiceMain,
  SimulationService,
  SlippageService,
  SlippageServiceMain,
  TokenHolderService,
  TokenHolderServiceMain,
  UsdService,
  UsdServiceMain,
  hooksServiceSymbol,
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
  const usdRepository = getUsdRepository(cacheRepository, erc20Repository);
  const pushNotificationsRepository = getPushNotificationsRepository();
  const pushSubscriptionsRepository = getPushSubscriptionsRepository();
  const duneRepository = getDuneRepository();

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

  apiContainer
    .bind<DuneRepository>(duneRepositorySymbol)
    .toConstantValue(duneRepository);

  // Services
  apiContainer
    .bind<HooksService>(hooksServiceSymbol)
    .toDynamicValue(() => new HooksServiceMain(duneRepository));

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
