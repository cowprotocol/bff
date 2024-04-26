import httpProxy from "@fastify/http-proxy";
import { FastifyPluginAsync } from "fastify";

const coingeckoProxy: FastifyPluginAsync = async (
  fastify,
  opts
): Promise<void> => {
  fastify.register(httpProxy, {
    upstream: "https://api.coingecko.com",
    rewritePrefix: "/api/v3/simple/",
    replyOptions: {
      rewriteRequestHeaders: (originalRequest: any, headers: any) => {
        return {
          ...headers,
          Origin: "https://swap.cow.fi",
        };
      },
    },
  });
};

export default coingeckoProxy;
