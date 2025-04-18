import {
  getCacheRepository,
  getErc20Repository,
  getSimulationRepository,
  getTokenHolderRepository,
  getUsdRepository,
} from '@cowprotocol/services';

import {
  CacheRepository,
  Erc20Repository,
  SimulationRepository,
  TokenHolderRepository,
  UsdRepository,
  cacheRepositorySymbol,
  erc20RepositorySymbol,
  tenderlyRepositorySymbol,
  tokenHolderRepositorySymbol,
  usdRepositorySymbol,
} from '@cowprotocol/repositories';

import {
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

import { logger } from '@cowprotocol/shared';

import { Container } from 'inversify';
import { Logger } from '@cowprotocol/shared';

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

  return apiContainer;
}

export const apiContainer = getApiContainer();
