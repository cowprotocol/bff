import { FastifyPluginAsync } from 'fastify';
import httpProxy from '@fastify/http-proxy';

const proxy: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  const upstream = fastify.config.TWAP_BASE_URL;
  if (!upstream) {
    fastify.log.warn('TWAP_BASE_URL is not set. Skipping proxy.');
    return;
  }

  fastify.register(httpProxy, {
    upstream,
  });
};

export default proxy;
