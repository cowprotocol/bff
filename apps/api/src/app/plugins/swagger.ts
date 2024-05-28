import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';

const HIDDEN_PATHS = ['/'];
const HIDDEN_BASE_PATHS = ['/proxies', '/proxy', '/twap'];

export default fp(async function (fastify: FastifyInstance) {
  fastify.register(fastifySwagger, {
    swagger: {
    },
    transform: (param) => {
      const { schema = {}, url } = param

      // can add the hide tag if needed
      const modifiedSchema = (isHiddenPath(url)) ? { ...schema, hide: true } : schema

      return { ...param, schema: modifiedSchema }
    }
  });
  fastify.register(fastifySwaggerUi, {
    routePrefix: '/docs',
  });
  fastify.ready((err) => {
    if (err) throw err;
    fastify.swagger();
  });

});

function isHiddenPath(url: string) {
  if (HIDDEN_BASE_PATHS.some(basePath => url.startsWith(basePath))) {
    return true;
  }

  if (HIDDEN_PATHS.some(basePath => url === basePath)) {
    return true;
  }

  return false
}