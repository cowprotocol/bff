import 'reflect-metadata';
import { FastifyInstance } from 'fastify';
import typeORMPlugin from 'typeorm-fastify-plugin';
import fp from 'fastify-plugin';
import { PoolInfo } from '../data/poolInfo';

export default fp(async function (fastify: FastifyInstance) {
  const dbParams = {
    host: fastify.config.COW_ANALYTICS_DATABASE_HOST,
    port: Number(fastify.config.COW_ANALYTICS_DATABASE_PORT),
    database: fastify.config.COW_ANALYTICS_DATABASE_NAME,
    username: fastify.config.COW_ANALYTICS_DATABASE_USERNAME,
    password: fastify.config.COW_ANALYTICS_DATABASE_PASSWORD,
  };

  const dbParamsAreInvalid = Object.values(dbParams).some(
    (v) => Number.isNaN(v) || v === undefined
  );

  if (dbParamsAreInvalid) {
    console.error(
      'Invalid CoW Analytics database parameters, please check COW_ANALYTICS_* env vars'
    );
    return;
  }

  fastify.register(typeORMPlugin, {
    ...dbParams,
    namespace: 'analytics',
    type: 'postgres',
    entities: [PoolInfo],
    ssl: true,
    extra: {
      ssl: {
        rejectUnauthorized: false,
      },
    },
  });

  fastify.ready((err) => {
    if (err) {
      throw err;
    }

    fastify.orm.analytics.runMigrations({ transaction: 'all' });
  });
});
