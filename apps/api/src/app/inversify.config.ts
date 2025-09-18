import {
  getCacheRepository,
  getErc20Repository,
  getPushNotificationsRepository,
  getPushSubscriptionsRepository,
  getSimulationRepository,
  getTokenBalancesRepository,
  getTokenHolderRepository,
  getUsdRepository,
  SimulationService,
  simulationServiceSymbol,
  SlippageService,
  SlippageServiceMain,
  slippageServiceSymbol,
  TokenBalancesService,
  TokenBalancesServiceMain,
  tokenBalancesServiceSymbol,
  TokenHolderService,
  TokenHolderServiceMain,
  tokenHolderServiceSymbol,
  UsdService,
  UsdServiceMain,
  usdServiceSymbol,
} from '@cowprotocol/services';

import {
  CacheRepository,
  cacheRepositorySymbol,
  Erc20Repository,
  erc20RepositorySymbol,
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
