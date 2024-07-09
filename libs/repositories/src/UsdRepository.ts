import { get } from 'http';

export interface UsdRepository {
  getDailyUsdPrice(tokenAddress: string, date: Date): Promise<number>;
}

export class UsdRepositoryMock implements UsdRepository {
  async getDailyUsdPrice(tokenAddress: string, date: Date): Promise<number> {
    return 1234;
  }
}

// TODO: Remove once we have IoC
export function getUsdRepository(): UsdRepository {
  return new UsdRepositoryMock();
}
