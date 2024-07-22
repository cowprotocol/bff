import IORedis from 'ioredis';

const REDIS_ENABLED = !!process.env.REDIS_HOST;

export const redisClient = REDIS_ENABLED
  ? new IORedis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      db: 0,
      username: process.env.REDIS_USER,
      password: process.env.REDIS_PASSWORD,
    })
  : null;
