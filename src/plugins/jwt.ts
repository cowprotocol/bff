import jwt from "@fastify/jwt";
import fp from "fastify-plugin";
import * as fs from "fs";

export default fp(async (fastify, opts) => {
  fastify.register(jwt, {
    secret: {
      private: {
        key: fs.readFileSync("certs/jwt/private.pem", "utf8"),
        passphrase: fastify.config.JWT_CERT_PASSPHRASE,
      },
      public: fs.readFileSync("certs/jwt/public.pem", "utf8"),
    },
    sign: { algorithm: "RS256" },
  });
});
