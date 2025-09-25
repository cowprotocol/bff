import {
  ALL_SUPPORTED_CHAINS_MAP,
  NATIVE_CURRENCY_ADDRESS,
  SupportedChainId,
} from '@cowprotocol/cow-sdk';
import { injectable } from 'inversify';
import { Erc20, Erc20Repository } from './Erc20Repository';

@injectable()
export class Erc20RepositoryNative implements Erc20Repository {
  async get(
    chainId: SupportedChainId,
    tokenAddress: string
  ): Promise<Erc20 | null> {
    if (tokenAddress.toLowerCase() !== NATIVE_CURRENCY_ADDRESS.toLowerCase()) {
      return null;
    }

    const chainInfo = ALL_SUPPORTED_CHAINS_MAP[chainId];
    if (!chainInfo?.nativeCurrency) {
      return null;
    }

    return chainInfo.nativeCurrency;
  }
}
