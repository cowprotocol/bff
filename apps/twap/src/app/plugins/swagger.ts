import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';

export default fp(async function (fastify: FastifyInstance) {
  fastify.register(fastifySwagger, {
    swagger: {},
  });
  fastify.register(fastifySwaggerUi, {
    routePrefix: '/docs',
  });
  fastify.ready((err) => {
    if (err) throw err;
    fastify.swagger();
  });
});
