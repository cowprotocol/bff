import pino from 'pino';

export type Logger = pino.Logger;

function getLogger() {
  // Uses pretty print if LOGGER is set to 'pretty'. By default, it will also use it for non-production environments.
  // If the LOGGER is not pretty, it defaults to a JSON logger.
  const usePrettyPrint = process.env.LOGGER
    ? process.env.LOGGER === 'pretty'
    : process.env.NODE_ENV !== 'production';

  const loggerConfigEnv = usePrettyPrint
    ? {
        transport: {
          target: 'pino-pretty',
        },
      }
    : {};

  return pino({
    ...loggerConfigEnv,
    level: process.env.LOG_LEVEL ?? 'info',
  });
}

export const logger = getLogger();
