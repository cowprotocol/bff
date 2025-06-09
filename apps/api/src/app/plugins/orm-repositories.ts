import 'reflect-metadata';
import { FastifyInstance } from 'fastify';
import typeORMPlugin from 'typeorm-fastify-plugin';
import fp from 'fastify-plugin';
import { resolve } from 'path';
import { logger } from '@cowprotocol/shared';

import { getDatabaseParams } from '@cowprotocol/repositories';
import { readdir } from 'fs/promises';
import { isDbEnabled } from '@cowprotocol/repositories';

export default fp(async function (fastify: FastifyInstance) {
  if (!isDbEnabled) {
    fastify.log.warn(
      'Database is disabled. ORM for repositories will not be used.'
    );
    return;
  }

  const isProduction = process.env.NODE_ENV === 'production';

  const migrationsDir = resolve(
    __dirname,
    '../../../../../libs/repositories/src/migrations'
  );

  fastify.register(typeORMPlugin, {
    ...getDatabaseParams(),
    namespace: 'repositories',
    type: 'postgres',
    migrations: [`${migrationsDir}/*.js`],
    migrationsTableName: 'migrations_repositories',
    entities: [],
    ssl: isProduction,
    extra: isProduction
      ? {
          ssl: {
            rejectUnauthorized: false,
          },
        }
      : undefined,
    logging: true, // Enable TypeORM logging
  });
  fastify.ready(async (err) => {
    if (err) {
      throw err;
    }

    try {
      logger.info('Starting migrations...');
      logger.info('Migrations dir:', migrationsDir);
      await printMigrations(migrationsDir);
      const result = await fastify.orm.repositories.runMigrations({
        transaction: 'all',
      });
      logger.info(`${result.length} migrations applied`);
    } catch (error) {
      logger.error('Migration error:', error);
      throw error;
    }
  });
});

async function printMigrations(dirPath: string) {
  try {
    const files = (await readdir(dirPath)).filter((file) =>
      file.endsWith('.js')
    );
    for (const file of files) {
      logger.info(`  - ${file}`);
    }
  } catch (err) {
    logger.error('Error reading directory:', err);
  }
}
