import fastify from "fastify";
import App from "../src/app";

const app = fastify({ logger: true });

app.register(App, {
  prefix: "/api/serverless",
});

export default async (req: any, res: any) => {
  await app.ready();
  app.server.emit("request", req, res);
};
