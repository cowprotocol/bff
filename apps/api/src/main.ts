import Fastify from 'fastify';
import { app } from './app/app';
import { logger } from '@cowprotocol/shared';
import { startAffiliateProgramExportPoller } from './app/affiliateProgramExportPoller';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3001;

// Instantiate Fastify with some config
export const server = Fastify({
  logger,
});

// Register your application as a normal plugin.
server.register(app);

startAffiliateProgramExportPoller();

// Start listening.
server.listen({ port, host }, (err) => {
  if (err) {
    server.log.error(err);
    process.exit(1);
  } else {
    server.log.info(`[ ready ] http://${host}:${port}`);
  }
});
