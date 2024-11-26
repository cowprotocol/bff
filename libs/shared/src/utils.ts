import { Address, getAddress } from 'viem';
import {
  AllChainIds,
  NativeCurrencyAddress,
  WrappedNativeTokenAddress,
} from './const';
import { SupportedChainId } from './types';

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


export function omit<T extends object, K extends keyof T>(object: T, omitKeys: K[]): Omit<T, K> {
  const result = { ...object };

  for (const key of omitKeys) {
    delete result[key];
  }

  return result;
}