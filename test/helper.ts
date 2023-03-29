import Fastify from "fastify";
import fp from "fastify-plugin";
import App from "../src/app";

export function build() {
  const app = Fastify();

  beforeAll(async () => {
    void app.register(fp(App));
    await app.ready();
  });

  afterAll(() => app.close());

  return app;
}
