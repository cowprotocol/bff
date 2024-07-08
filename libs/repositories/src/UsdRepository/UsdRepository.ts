import { injectable } from 'inversify';

export const usdRepositorySymbol = Symbol.for('UsdRepository');

export interface UsdRepository {
  getDailyUsdPrice(tokenAddress: string, date: Date): Promise<number>;
}

@injectable()
export class UsdRepositoryMock implements UsdRepository {
  async getDailyUsdPrice(_tokenAddress: string, _date: Date): Promise<number> {
    // Return a random number between 1 and 1000
    return Math.floor(Math.random() * 1000) + 1;
  }
}
