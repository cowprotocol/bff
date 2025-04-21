import { Pool } from 'pg';

export function getPostgresPool(): Pool {
  const pool = new Pool({
    user: process.env.DATABASE_USERNAME,
    host: process.env.DATABASE_HOST,
    database: process.env.DATABASE_NAME,
    password: process.env.DATABASE_PASSWORD,
    port: Number(process.env.DATABASE_PORT) || 5432,
    keepAlive: true,
  });

  // Handle connection errors
  pool.on('error', (err) => {
    console.error('Unexpected error on idle database client', err);
  });

  return pool;
}
