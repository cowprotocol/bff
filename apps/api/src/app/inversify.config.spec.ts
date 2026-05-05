import 'reflect-metadata';
import { decorate, injectable } from 'inversify';

const symbol = (name: string): symbol => Symbol.for(name);
const emptyObject = (): Record<string, never> => ({});
const getter = () => jest.fn(emptyObject);

const affiliateStatsServiceSymbol = symbol('AffiliateStatsService');
const duneRepositorySymbol = symbol('DuneRepository');

const getters = {
  getAffiliatesRepository: getter(),
  getCacheRepository: getter(),
  getDuneRepository: jest.fn(() => ({ getQueryResults: jest.fn() })),
  getErc20Repository: getter(),
  getPushNotificationsRepository: getter(),
  getPushSubscriptionsRepository: getter(),
  getSimulationRepository: getter(),
  getTokenBalancesRepository: getter(),
  getTokenHolderRepository: getter(),
  getUserBalanceRepository: getter(),
  getUsdRepository: getter(),
};

const plainClasses = Object.fromEntries(
  [
    'AffiliatesRepository',
    'AffiliateProgramExportService',
    'AffiliateProgramExportServiceImpl',
    'AffiliateStatsService',
    'CacheRepository',
    'DuneRepository',
    'Erc20Repository',
    'HooksService',
    'HooksServiceImpl',
    'Logger',
    'PushNotificationsRepository',
    'PushSubscriptionsRepository',
    'SimulationRepository',
    'SlippageService',
    'SSEService',
    'TokenBalancesRepository',
    'TokenBalancesService',
    'TokenDetailService',
    'TokenHolderRepository',
    'TokenHolderService',
    'UsdRepository',
    'UsdService',
    'UserBalanceRepository',
    'BalanceTrackingService',
  ].map((name) => [name, class {}])
);

class InjectableStub {}
decorate(injectable(), InjectableStub);

class MockAffiliateStatsServiceImpl {
  static instances: MockAffiliateStatsServiceImpl[] = [];

  constructor(
    public readonly duneRepository: unknown,
    public readonly cacheTtlMs: number
  ) {
    MockAffiliateStatsServiceImpl.instances.push(this);
  }
}

const symbols = {
  affiliatesRepositorySymbol: symbol('AffiliatesRepository'),
  affiliateProgramExportServiceSymbol: symbol('AffiliateProgramExportService'),
  affiliateStatsServiceSymbol,
  balanceTrackingServiceSymbol: symbol('BalanceTrackingService'),
  cacheRepositorySymbol: symbol('CacheRepository'),
  duneRepositorySymbol,
  erc20RepositorySymbol: symbol('Erc20Repository'),
  hooksServiceSymbol: symbol('HooksService'),
  pushNotificationsRepositorySymbol: symbol('PushNotificationsRepository'),
  pushSubscriptionsRepositorySymbol: symbol('PushSubscriptionsRepository'),
  simulationServiceSymbol: symbol('SimulationService'),
  slippageServiceSymbol: symbol('SlippageService'),
  sseServiceSymbol: symbol('SSEService'),
  tenderlyRepositorySymbol: symbol('SimulationRepository'),
  tokenBalancesRepositorySymbol: symbol('TokenBalancesRepository'),
  tokenBalancesServiceSymbol: symbol('TokenBalancesService'),
  tokenDetailServiceSymbol: symbol('TokenDetailService'),
  tokenHolderRepositorySymbol: symbol('TokenHolderRepository'),
  tokenHolderServiceSymbol: symbol('TokenHolderService'),
  usdRepositorySymbol: symbol('UsdRepository'),
  usdServiceSymbol: symbol('UsdService'),
  userBalanceRepositorySymbol: symbol('UserBalanceRepository'),
};

jest.mock('@cowprotocol/repositories', () => ({
  ...plainClasses,
  ...symbols,
  ...getters,
  isCmsEnabled: false,
  isDuneEnabled: true,
}));

jest.mock('@cowprotocol/shared', () => ({
  Logger: plainClasses.Logger,
  logger: { warn: jest.fn() },
}));

jest.mock('@cowprotocol/services', () => ({
  ...plainClasses,
  ...symbols,
  ...getters,
  AffiliateStatsServiceImpl: MockAffiliateStatsServiceImpl,
  BalanceTrackingServiceMain: InjectableStub,
  SSEServiceMain: InjectableStub,
  SimulationService: InjectableStub,
  SlippageServiceMain: InjectableStub,
  TokenBalancesServiceMain: InjectableStub,
  TokenDetailServiceMain: InjectableStub,
  TokenHolderServiceMain: InjectableStub,
  UsdServiceMain: InjectableStub,
}));

describe('getApiContainer', () => {
  const originalTtl = process.env.DUNE_AFFILIATE_STATS_CACHE_TTL_MS;

  beforeEach(() => {
    MockAffiliateStatsServiceImpl.instances = [];
    process.env.DUNE_AFFILIATE_STATS_CACHE_TTL_MS = '1234';
    jest.resetModules();
  });

  afterAll(() => {
    if (originalTtl === undefined) {
      delete process.env.DUNE_AFFILIATE_STATS_CACHE_TTL_MS;
      return;
    }

    process.env.DUNE_AFFILIATE_STATS_CACHE_TTL_MS = originalTtl;
  });

  it('reuses the same affiliate stats service instance', async () => {
    const { getApiContainer } = await import('./inversify.config');

    const container = getApiContainer();
    const first = container.get<MockAffiliateStatsServiceImpl>(
      affiliateStatsServiceSymbol
    );
    const second = container.get<MockAffiliateStatsServiceImpl>(
      affiliateStatsServiceSymbol
    );

    expect(first).toBe(second);
    expect(MockAffiliateStatsServiceImpl.instances).toHaveLength(1);
    expect(first.cacheTtlMs).toBe(1234);
    expect(first.duneRepository).toBe(
      getters.getDuneRepository.mock.results.at(-1)?.value
    );
  });
});
