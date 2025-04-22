import { Address, formatUnits, getAddress } from 'viem';

import {
  AllChainIds,
  EXPLORER_NETWORK_NAMES,
  NativeCurrencyAddress,
  WrappedNativeTokenAddress,
} from './const';
import { SupportedChainId } from './types';

import pino from 'pino';
import { logger } from './logger';

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

export async function doForever(params: {
  name: string;
  callback: (stop: () => void) => Promise<void>;
  waitTimeMilliseconds: number;
  logger: Logger;
}) {
  const { name, callback, waitTimeMilliseconds, logger } = params;

  // eslint-disable-next-line no-constant-condition
  let running = true;

  const { wakeUpPromise, wakeUp } = createWakeUpPromise();

  while (running) {
    const stop = () => {
      logger.info(`[${name}] Stopping...`);
      wakeUp(); // Wake up if its sleeping (so it can end faster)
      running = false;
    };

    try {
      await callback(stop);
    } catch (error) {
      const errorName = error instanceof Error ? `: ${error.name}` : '';
      logger.error(error, `[${name}] Error${errorName}`);
      logger.info(`[${name}] Next-run in ${waitTimeMilliseconds / 1000}s...`);
    } finally {
      await Promise.race([sleep(waitTimeMilliseconds), wakeUpPromise]);
    }
  }
  logger.info(`[${name}] Stopped`);
}

function createWakeUpPromise(): {
  wakeUpPromise: Promise<unknown>;
  wakeUp: () => void;
} {
  let wakeUpResolve: ((value: unknown) => void) | undefined = undefined;
  const wakeUpPromise = new Promise((resolve) => {
    wakeUpResolve = resolve;
  });

  return {
    wakeUpPromise,
    wakeUp: () => {
      if (wakeUpResolve) {
        wakeUpResolve(undefined);
      } else {
        logger.warn('WakeUp promise not initialized. Nothing to wake up.');
      }
    },
  };
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getExplorerUrl(chainId: SupportedChainId, orderUid: string) {
  const baseUrl = getExplorerBaseUrl(chainId);
  return `${baseUrl}/orders/${orderUid}`;
}

export function getExplorerBaseUrl(chainId: SupportedChainId) {
  const suffix =
    chainId === SupportedChainId.MAINNET
      ? ''
      : `/${EXPLORER_NETWORK_NAMES[chainId]}`;
  return `https://explorer.cow.fi${suffix}`;
}

export function formatAmount(amount: bigint, decimals: number | undefined) {
  return decimals ? formatUnits(amount, decimals) : amount.toString();
}

export function formatTokenName(
  token: { symbol?: string; address: string } | null
) {
  return token?.symbol ? `${token.symbol}` : token?.address;
}

export function ensureEnvs(envs: string[]) {
  const missingEnvs = envs.filter((env) => !process.env[env]);
  if (missingEnvs.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingEnvs.join(', ')}`
    );
  }
}
