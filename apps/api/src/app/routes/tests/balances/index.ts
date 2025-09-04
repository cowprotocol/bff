import { FastifyPluginAsync } from 'fastify';
import { readFileSync } from 'fs';
import { join } from 'path';

const root: FastifyPluginAsync = async (fastify): Promise<void> => {
  // Serve the SSE test HTML page
  fastify.get('/', { schema: { tags: ['tests'] } }, async (request, reply) => {
    // Use process.cwd() to get the project root, then navigate to the source file
    const htmlPath = join(
      process.cwd(),
      'apps/api/src/app/routes/tests/balances/sse-test.html'
    );
    const htmlContent = readFileSync(htmlPath, 'utf8');

    return reply.type('text/html').send(htmlContent);
  });
};

export default root;
