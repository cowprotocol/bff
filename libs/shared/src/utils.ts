import { Address, getAddress } from 'viem';
import {
  AllChainIds,
  NativeCurrencyAddress,
  WrappedNativeTokenAddress,
} from './const';
import { SupportedChainId } from './types';

import pino from 'pino';

export type Logger = pino.Logger;

export function getLogger() {
  // Uses pretty print if env.LOG_FORMAT is set to 'pretty'. By default, it will also use it for non-production environments.
  // If the env.LOG_FORMAT is not 'pretty', it defaults to a JSON logger.
  const usePrettyPrint = process.env.LOG_FORMAT
    ? process.env.LOG_FORMAT === 'pretty'
    : process.env.NODE_ENV !== 'production';

  const loggerConfigEnv = usePrettyPrint
    ? {
        transport: {
          target: 'pino-pretty',
        },
      }
    : {};

  return pino({
    ...loggerConfigEnv,
    level: process.env.LOG_LEVEL ?? 'info',
  });
}

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
