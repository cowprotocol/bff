import fp from "fastify-plugin";
import fastifyEnv from "@fastify/env";

const schema = {
  type: "object",
  required: [
    "PROXY_ORIGIN",
    "PROXY_UPSTREAM",
    "JWT_CERT_PASSPHRASE",
    "INFURA_JWT_ID",
    "INFURA_KEY",
  ],
  properties: {
    PROXY_ORIGIN: {
      type: "string",
    },
    PROXY_UPSTREAM: {
      type: "string",
    },
    JWT_CERT_PASSPHRASE: {
      type: "string",
    },
    INFURA_JWT_ID: {
      type: "string",
    },
    INFURA_KEY: {
      type: "string",
    },
  },
};

export default fp(async (fastify, opts) => {
  const options = {
    ...opts,
    schema,
  };

  fastify.register(fastifyEnv, options);
});

declare module "fastify" {
  interface FastifyInstance {
    config: {
      // Currently only supports string type like this.
      [K in keyof typeof schema.properties]: string;
    };
  }
}
