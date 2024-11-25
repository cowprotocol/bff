import 'reflect-metadata';
import { FastifyInstance } from 'fastify';
import typeORMPlugin from 'typeorm-fastify-plugin';
import fp from 'fastify-plugin';
import { PoolInfo } from '../data/poolInfo';

export default fp(async function (fastify: FastifyInstance) {
  fastify.register(typeORMPlugin, {
    host: fastify.config.COW_ANALYTICS_DATABASE_HOST,
    port: Number(fastify.config.COW_ANALYTICS_DATABASE_PORT),
    type: 'postgres',
    database: fastify.config.COW_ANALYTICS_DATABASE_NAME,
    username: fastify.config.COW_ANALYTICS_DATABASE_USERNAME,
    password: fastify.config.COW_ANALYTICS_DATABASE_PASSWORD,
    entities: [PoolInfo],
    ssl: true,
    extra: {
      ssl: {
        rejectUnauthorized: false
      }
    }
  });

  fastify.ready((err) => {
    if (err) {
      throw err;
    }

    fastify.orm.runMigrations({ transaction: 'all' });
  });
});
