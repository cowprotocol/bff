import cors from "@fastify/cors";
import fp from "fastify-plugin";

export default fp(async (fastify, opts) => {
  const options = {
    ...opts,
    origin: false,
  };
  fastify.register(cors, options);
});
