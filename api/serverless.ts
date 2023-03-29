import fastify from "fastify";
import App from "../src/app";

const app = fastify({ logger: true });

app.register(App);

export default async (req, res) => {
  await app.ready();
  app.server.emit("request", req, res);
};
