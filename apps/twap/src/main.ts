import Fastify from 'fastify';
import { JsonSchemaToTsProvider } from '@fastify/type-provider-json-schema-to-ts';
import { app } from './app/app';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3001;

// Instantiate Fastify with some config
const server = Fastify({
  logger: true,
}).withTypeProvider<JsonSchemaToTsProvider>();

// Register your application as a normal plugin.
server.register(app);

// Start listening.
server.listen({ port, host }, (err) => {
  if (err) {
    server.log.error(err);
    process.exit(1);
  } else {
    console.log(`[ ready ] http://${host}:${port}`);
  }
});
