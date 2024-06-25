import { log } from 'console';
import { FastifyPluginAsync } from 'fastify';

import { readFileSync } from 'fs';
const GIT_COMMIT_HASH_FILE = 'git-commit-hash.txt';
const VERSION = process.env.VERSION || 'UNKNOWN, please set the environment variable';
const COMMIT_HASH = getCommitHash();
import { join } from 'path';
import { server } from '../../main';



interface AboutResponse {
  name: string;
  version: string;
  gitCommitHash?: string | undefined;
}

const about: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get<{ Reply: AboutResponse }>('/about', async function (_request, reply) {
    return reply.send({
      name: 'BFF API',
      version: VERSION,
      gitCommitHash: COMMIT_HASH,
    });
  });
};

/**
 * Read a file with the git commit hash (generated for example using github actions)
 */
function getCommitHash(): string | undefined {
  const filePath = join(__dirname, '../..', GIT_COMMIT_HASH_FILE)
  try {
    return readFileSync(filePath, 'utf-8')
  } catch (error) {
    // Not a big deal, if the file is not present, the about won't 
    server.log.warn(`Unable to read the file with the git commit hash: ${filePath}. /about endpoint won't export the 'gitCommitHash'`);
    return undefined
  }
}

export default about;
