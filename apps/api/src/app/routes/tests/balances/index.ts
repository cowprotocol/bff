import { FastifyPluginAsync } from 'fastify';
import { readFileSync } from 'fs';
import { join } from 'path';

const root: FastifyPluginAsync = async (fastify): Promise<void> => {
  // Serve the SSE test HTML page
  fastify.get('/', { schema: { tags: ['tests'] } }, async (request, reply) => {
    // Resolve from the copied assets folder (shared build rule).
    const htmlPath = join(
      process.cwd(),
      'apps/api/src/assets/tests/balances/sse-test.html'
    );
    const htmlContent = readFileSync(htmlPath, 'utf8');

    return reply.type('text/html').send(htmlContent);
  });
};

export default root;
