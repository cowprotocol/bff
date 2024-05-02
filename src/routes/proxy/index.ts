import { FastifyPluginAsync } from "fastify";

// This path moved from /proxy to /proxies/tokens
const proxy: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.all("/", (_request, response) => {
    response.redirect(301, "/proxies/tokens");
  });
};

export default proxy;
