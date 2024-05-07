import { FastifyPluginAsync } from "fastify";
import httpProxy from "@fastify/http-proxy";

const proxy: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.register(httpProxy, {
    upstream: fastify.config.PROXY_UPSTREAM,
    replyOptions: {
      rewriteRequestHeaders: (originalRequest: any, headers: any) => {
        return {
          ...headers,
          Origin: fastify.config.PROXY_ORIGIN,
        };
      },
    },
  });
};

export default proxy;
