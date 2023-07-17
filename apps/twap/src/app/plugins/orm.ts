import 'reflect-metadata';
import { FastifyInstance } from 'fastify';
import typeORMPlugin from 'typeorm-fastify-plugin';
import fp from 'fastify-plugin';
import { Order } from '../data/order';
import { Wallet } from '../data/wallet';
import { SafeTx } from '../data/safeTx';
import { Order as OrderbookOrder } from '../orderbook/order';
import { Settlement } from '../orderbook/settlement';
import { Trade } from '../orderbook/trade';
import { OrderPart } from '../data/orderPart';
import { Block } from '../data/block';

export default fp(async function (fastify: FastifyInstance) {
  fastify.register(typeORMPlugin, {
    host: fastify.config.DATABASE_HOST,
    port: fastify.config.DATABASE_PORT,
    type: 'postgres',
    database: fastify.config.DATABASE_NAME,
    username: fastify.config.DATABASE_USERNAME,
    password: fastify.config.DATABASE_PASSWORD,
    entities: [Wallet, Order, SafeTx, OrderPart, Block],
    migrations: ['twap/apps/twap/src/migrations/*.js'],
  });

  fastify.register(typeORMPlugin, {
    namespace: 'goerli',
    host: fastify.config.ORDERBOOK_DATABASE_HOST,
    port: fastify.config.ORDERBOOK_DATABASE_PORT,
    type: 'postgres',
    database: 'goerli',
    username: fastify.config.ORDERBOOK_DATABASE_USERNAME,
    password: fastify.config.ORDERBOOK_DATABASE_PASSWORD,
    entities: [Settlement, Trade, OrderbookOrder],
  });

  fastify.register(typeORMPlugin, {
    namespace: 'mainnet',
    host: fastify.config.ORDERBOOK_DATABASE_HOST,
    port: fastify.config.ORDERBOOK_DATABASE_PORT,
    type: 'postgres',
    database: 'mainnet',
    username: fastify.config.ORDERBOOK_DATABASE_USERNAME,
    password: fastify.config.ORDERBOOK_DATABASE_PASSWORD,
    entities: [Settlement, Trade, OrderbookOrder],
  });

  fastify.ready((err) => {
    if (err) {
      throw err;
    }

    fastify.orm.runMigrations({ transaction: 'all' });
  });
});
