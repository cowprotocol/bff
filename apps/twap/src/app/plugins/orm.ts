import 'reflect-metadata';
import { FastifyInstance } from 'fastify';
import typeORMPlugin from 'typeorm-fastify-plugin';
import fp from 'fastify-plugin';
import { Order } from '../data/order';
import { Wallet } from '../data/wallet';

export default fp(async function (fastify: FastifyInstance) {
  fastify.register(typeORMPlugin, {
    host: fastify.config.DATABASE_HOST,
    port: fastify.config.DATABASE_PORT,
    type: 'postgres',
    database: fastify.config.DATABASE_NAME,
    username: fastify.config.DATABASE_USERNAME,
    password: fastify.config.DATABASE_PASSWORD,
    entities: [Wallet, Order],
    migrations: ['twap/apps/twap/src/migrations/*.js'],
  });

  fastify.ready((err) => {
    if (err) {
      throw err;
    }

    fastify.orm.runMigrations({ transaction: 'all' });
  });
});
