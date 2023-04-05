import { FastifyPluginAsync } from "fastify";
import httpProxy from "@fastify/http-proxy";

const mainnet = (key: string) => `https://mainnet.infura.io/v3/${key}`;
const goerli = (key: string) => `https://goerli.infura.io/v3/${key}`;

const infura: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  const authorizationHeader = (body: any) =>
    "Bearer " +
    fastify.jwt.sign(body, {
      kid: fastify.config.INFURA_JWT_ID,
      aud: "infura.io",
      algorithm: "RS256",
      expiresIn: "1h",
    });

  fastify.register(httpProxy, {
    prefix: "/mainnet",
    upstream: mainnet(fastify.config.INFURA_KEY),
    proxyPayloads: false,
    replyOptions: {
      rewriteRequestHeaders: (originalRequest, headers) => {
        return {
          ...headers,
          authorization: authorizationHeader(originalRequest.body),
        };
      },
    },
  });

  fastify.register(httpProxy, {
    prefix: "/goerli",
    upstream: goerli(fastify.config.INFURA_KEY),
    proxyPayloads: false,
    replyOptions: {
      rewriteRequestHeaders: (originalRequest, headers) => {
        return {
          ...headers,
          authorization: authorizationHeader(originalRequest.body),
        };
      },
    },
  });
};

export default infura;
