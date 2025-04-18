import IORedis from 'ioredis';

// Check if redis is enable REDIS_ENABLED env takes precence. Otherwise enable if we provide REDIS_HOST
const isRedisEnabled =
  process.env.REDIS_ENABLED !== undefined
    ? process.env.REDIS_ENABLED === 'true'
    : !!process.env.REDIS_HOST;

export const redisClient = isRedisEnabled
  ? new IORedis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      db: 0,
      username: process.env.REDIS_USER,
      password: process.env.REDIS_PASSWORD,
    })
  : null;
