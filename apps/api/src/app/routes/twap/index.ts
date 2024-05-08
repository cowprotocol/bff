import { FastifyPluginAsync } from "fastify";
import httpProxy from "@fastify/http-proxy";

const proxy: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.register(httpProxy, {
    upstream: fastify.config.TWAP_BASE_URL,
  });
};

export default proxy;
