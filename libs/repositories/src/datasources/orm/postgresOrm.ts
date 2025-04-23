// import { ensureEnvs } from '@cowprotocol/shared';
import { DataSource } from 'typeorm';

import assert from 'assert';
import { IndexerState } from '../../database/IndexerState.entity';

export function createNewPostgresOrm(): DataSource {
  // Note: not using the `ensureEnvs` util function because it causes issues with the migrations)
  assert(process.env.DATABASE_HOST, 'DATABASE_HOST is not set');
  assert(process.env.DATABASE_PORT, 'DATABASE_PORT is not set');
  assert(process.env.DATABASE_USERNAME, 'DATABASE_USERNAME is not set');
  assert(process.env.DATABASE_PASSWORD, 'DATABASE_PASSWORD is not set');
  assert(process.env.DATABASE_NAME, 'DATABASE_NAME is not set');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT),
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    // entities: ['src/database/*.ts'],
    entities: [IndexerState],
    migrations: ['src/migrations/*.ts'],
    migrationsTableName: 'migrations_repositories',
  });

  return dataSource;
}
