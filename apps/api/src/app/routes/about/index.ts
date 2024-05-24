import { log } from 'console';
import { FastifyPluginAsync } from 'fastify';

import { readFileSync } from 'fs';
const GIT_COMMIT_HASH_FILE = '.git-commit-hash';
const VERSION = process.env.VERSION || 'UNKNOWN, please set the environment variable';
const COMMIT_HASH = getCommitHash();


interface AboutResponse {
  name: string;
  version: string;
  commitHash?: string | undefined;
}

const example: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get<{ Reply: AboutResponse }>('/', async function (_request, reply) {
    return reply.send({
      name: 'BFF API',
      version: VERSION,
      commitHash: COMMIT_HASH,
    });
  });
};

/**
 * Read a file with the git commit hash (generated for example using github actions)
 */
function getCommitHash(): string | undefined {
  try {
    return readFileSync(GIT_COMMIT_HASH_FILE, 'utf-8')
  } catch (error) {
    // Not a big deal, if the file is not present, the about won't 
    console.warn(`Unable to read the commit hash file: ${GIT_COMMIT_HASH_FILE}. It won't be exported in the about section`);  
    return undefined
  }
}

export default example;
