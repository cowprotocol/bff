import Fastify from 'fastify';
import { app } from './app/app';

import { NestFactory } from '@nestjs/core';
import {
  NestFastifyApplication,
  FastifyAdapter,
} from '@nestjs/platform-fastify';
import { AppModule } from './app2/app.module';
import { join } from 'path';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

// ----------- NEST BOOTSTRAP -----------

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({})
  );
  app.useStaticAssets({
    root: join(__dirname, '..', 'public'),
    prefix: '/public/',
  });
  app.setViewEngine({
    engine: {
      handlebars: require('handlebars'),
    },
    templates: join(__dirname, '..', 'views'),
  });

  const nestPort = port + 1;
  await app.listen(nestPort, (e) => {
    if (e) {
      console.error(e);
    } else {
      console.log(`✅ [NEST-fastify] Ready on http://${host}:${nestPort}`);
    }
  });
}
bootstrap();

// ----------- BELOW HERE IS OUR FASTIFY SERVER CODE -----------

// Instantiate Fastify with some config
export const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
  },
});

// Register your application as a normal plugin.
server.register(app);

// Start listening.
server.listen({ port, host }, (err) => {
  if (err) {
    server.log.error(err);
    process.exit(1);
  } else {
    server.log.info(`[ ready ] http://${host}:${port}`);
  }
});
