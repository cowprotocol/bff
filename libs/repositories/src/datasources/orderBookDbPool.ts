import { ensureEnvs } from '@cowprotocol/shared';
import { Pool } from 'pg';
import { SupportedChainId } from '@cowprotocol/cow-sdk';

const REQUIRED_ENVS = [
  'ORDERBOOK_DATABASE_HOST',
  'ORDERBOOK_DATABASE_PORT',
  'ORDERBOOK_DATABASE_USERNAME',
  'ORDERBOOK_DATABASE_PASSWORD',
];

const chainToDbNameMap: Record<SupportedChainId, string> = {
  [SupportedChainId.MAINNET]: 'mainnet',
  [SupportedChainId.GNOSIS_CHAIN]: 'xdai',
  [SupportedChainId.BASE]: 'base',
  [SupportedChainId.POLYGON]: 'polygon',
  [SupportedChainId.AVALANCHE]: 'avalanche',
  [SupportedChainId.ARBITRUM_ONE]: 'arbitrum-one',
  [SupportedChainId.BNB]: 'bnb',
  [SupportedChainId.LENS]: 'lens',
  [SupportedChainId.SEPOLIA]: 'sepolia',
}

function createNewOrderBookDbPool(env: 'prod' | 'barn', chainId: SupportedChainId): Pool {
  const ENV_PREFIX = env.toUpperCase()

  ensureEnvs(REQUIRED_ENVS.map((name) => `${ENV_PREFIX}_${name}`));

  const pool = new Pool({
    user: process.env[`${ENV_PREFIX}_ORDERBOOK_DATABASE_USERNAME`],
    host: process.env[`${ENV_PREFIX}_ORDERBOOK_DATABASE_HOST`],
    database: chainToDbNameMap[chainId],
    password: process.env[`${ENV_PREFIX}_ORDERBOOK_DATABASE_PASSWORD`],
    port: Number(process.env[`${ENV_PREFIX}_ORDERBOOK_DATABASE_PORT`]),
    keepAlive: true,
  });

  // Handle connection errors
  pool.on('error', (err) => {
    console.error('Unexpected error on idle database client', err);
  });

  return pool;
}

const orderBookDbCache = new Map<string, Pool>()

export function getOrderBookDbPool(env: 'prod' | 'barn', chainId: SupportedChainId) {
  const key = `${env}|${chainId}`;
  const cached = orderBookDbCache.get(key)

  if (cached) return cached

  const db = createNewOrderBookDbPool(env, chainId);

  orderBookDbCache.set(key, db);

  return db;
}