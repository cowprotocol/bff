import IORedis from 'ioredis';
export const redis = new IORedis({ host: process.env.REDIS_HOST || '127.0.0.1', db: 0 })