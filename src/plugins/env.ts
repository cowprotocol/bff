import fastifyEnv from "@fastify/env";
import fp from "fastify-plugin";

const schema = {
  type: "object",
  required: ["PROXY_ORIGIN", "PROXY_UPSTREAM"],
  properties: {
    PROXY_ORIGIN: {
      type: "string",
    },
    PROXY_UPSTREAM: {
      type: "string",
    },
  },
};

export default fp(async (fastify, opts) => {
  const options = {
    ...opts,
    schema,
    dotenv: true,
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