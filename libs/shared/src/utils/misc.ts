import { Address, getAddress } from 'viem';

import {
  AllChainIds,
  NativeCurrencyAddress,
  WrappedNativeTokenAddress,
} from '../const';
import { SupportedChainId } from '../types';

/**
 * Returns the token address. This function will throw if the address passed is not an Ethereum address.
 * It will also convert the address representing the native currency (0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE) into
 * its wrapped version.
 */
export function toTokenAddress(
  address: string,
  chainId: SupportedChainId
): Address {
  if (address.toLocaleLowerCase() === NativeCurrencyAddress) {
    return WrappedNativeTokenAddress[chainId];
  }

  return getAddress(address.toLowerCase());
}

export function isSupportedChain(chain: number): chain is SupportedChainId {
  return AllChainIds.includes(chain as SupportedChainId);
}

export function toSupportedChainId(chain: string | number): SupportedChainId {
  if (typeof chain === 'string') {
    chain = parseInt(chain);
  }

  if (!isSupportedChain(chain)) {
    throw new Error(
      `Unsupported chain ID: ${chain}. Supported chains are: ${AllChainIds.join(
        ', '
      )}`
    );
  }

  return chain;
}

export function bigIntReplacer(key: string, value: any): any {
  if (typeof value === 'bigint') {
    return value.toString() + 'n';
  }
  return value;
}

export function bigIntReviver(key: string, value: any): any {
  if (typeof value === 'string' && /^\d+n$/.test(value)) {
    return BigInt(value.slice(0, -1));
  }
  return value;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function ensureEnvs(envs: string[]) {
  const missingEnvs = envs.filter((env) => !process.env[env]);
  if (missingEnvs.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingEnvs.join(', ')}`
    );
  }
}
