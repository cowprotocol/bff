import { SupportedChainId } from '@cowprotocol/cow-sdk';
import { Pool } from 'pg'; // If using node-postgres
import { OrderEvent } from './types';

// Database connection
// TODO: do this properly using fastify
const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: 'mainnet', // TODO: make this dynamic based on the chainId. The method passes the chainId
  password: process.env.POSTGRES_PASSWORD,
  port: Number(process.env.POSTGRES_PORT) || 5432,
});

// Example query function
async function executeQuery(query: string, params: any[]) {
  try {
    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}

export async function getOrderEvents(
  chainId: SupportedChainId,
  orderId: string
): Promise<OrderEvent[]> {
  if (chainId !== SupportedChainId.MAINNET) {
    throw new Error('Only Mainnet is supported');
  }

  // Check the connection to the DB works
  return await executeQuery(
    "SELECT timestamp as time, label as value FROM order_events WHERE order_uid = decode($1, 'hex')",
    [orderId.substring(2)]
  );
}
