import { get } from 'http';

export interface UsdRepository {
  getPriceDayUsd(tokenAddress: string, date: Date): Promise<number>;
}

export class UsdRepositoryMock {
  async getPriceDayUsd(tokenAddress: string, date: Date): Promise<number> {
    return 1234;
  }
}

// TODO: Remove once we have IoC
export function getUsdRepository(): UsdRepository {
  return new UsdRepositoryMock();
}
