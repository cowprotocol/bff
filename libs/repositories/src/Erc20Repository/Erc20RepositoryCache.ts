import { inject, injectable } from 'inversify';
import NodeCache from 'node-cache';
import { Erc20, Erc20Repository } from './Erc20Repository';
import { CacheRepository } from '../CacheRepository/CacheRepository';
import { SupportedChainId } from '../types';

const NULL_VALUE = 'null';

@injectable()
export class Erc20RepositoryCache implements Erc20Repository {
  private baseCacheKey: string;

  constructor(
    private proxy: Erc20Repository,
    private cache: CacheRepository,
    private cacheName: string,
    private cacheTimeSeconds: number
  ) {
    this.baseCacheKey = `repos:${this.cacheName}`;
  }

  async get(chainId: SupportedChainId, tokenAddress: string): Promise<Erc20> {
    const cacheKey = `${this.baseCacheKey}:get:${chainId}:${tokenAddress}`;

    // Get cached value
    const valueString = await this.cache.get(cacheKey);
    if (valueString) {
      return valueString === NULL_VALUE ? null : JSON.parse(valueString);
    }

    // Get fresh value from proxy
    const value = await this.proxy.get(chainId, tokenAddress);

    // Cache value
    const cacheValue = value === null ? NULL_VALUE : JSON.stringify(value);
    await this.cache.set(cacheKey, cacheValue, this.cacheTimeSeconds);

    return value;
  }
}
