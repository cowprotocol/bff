import pino from 'pino';

export type Logger = pino.Logger;

const loggerConfigEnv =
  process.env.NODE_ENV === 'production'
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
        },
      };

export const logger = pino({
  ...loggerConfigEnv,
  level: process.env.LOG_LEVEL ?? 'info',
});
