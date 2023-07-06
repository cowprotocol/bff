import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export default async function (fastify: FastifyInstance) {
  fastify.get(
    '/health-check',
    async function (request: FastifyRequest, reply: FastifyReply) {
      reply.status(200).send({ status: 'ok' });
    }
  );
}
