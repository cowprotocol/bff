import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { v4 as uuidv4 } from 'uuid';
import { apiContainer } from '../../../../../inversify.config';
import { AddressSchema, SupportedChainIdSchema } from '../../../../../schemas';
import {
  SSEService,
  sseServiceSymbol,
  BalanceTrackingService,
  balanceTrackingServiceSymbol,
  SSEClient,
  TokenBalancesService,
  tokenBalancesServiceSymbol,
} from '@cowprotocol/services';
import { parseEthereumAddressList } from '@cowprotocol/shared';

const paramsSchema = {
  type: 'object',
  required: ['chainId', 'userAddress'],
  additionalProperties: false,
  properties: {
    chainId: SupportedChainIdSchema,
    userAddress: AddressSchema,
  },
} as const satisfies JSONSchema;

const querySchema = {
  type: 'object',
  required: ['tokens'],
  additionalProperties: false,
  properties: {
    tokens: {
      type: 'string',
      description: 'Comma-separated list of token addresses',
    },
  },
} as const satisfies JSONSchema;

const successSchema = {
  type: 'array',
  items: {
    type: 'object',
    required: ['token', 'balance', 'allowance'],
    additionalProperties: false,
    properties: {
      balance: {
        type: 'string',
        description: 'User balance in token units',
      },
      allowance: {
        type: 'string',
        description: 'Allowance for Cow Protocol vault relayer',
      },
      token: {
        type: 'object',
        required: ['address'],
        additionalProperties: false,
        properties: {
          address: {
            type: 'string',
            description: 'Token contract address',
          },
          decimals: {
            type: 'number',
            description: 'Token decimals',
          },
          symbol: {
            type: 'string',
            description: 'Token symbol',
          },
          name: {
            type: 'string',
            description: 'Token name',
          },
        },
      },
    },
  },
} as const satisfies JSONSchema;

const errorSchema = {
  type: 'object',
  required: ['message'],
  additionalProperties: false,
  properties: {
    message: {
      type: 'string',
      description: 'Error message',
    },
  },
} as const satisfies JSONSchema;

type ParamsSchema = FromSchema<typeof paramsSchema>;
type QuerySchema = FromSchema<typeof querySchema>;
type SuccessSchema = FromSchema<typeof successSchema>;
type ErrorSchema = FromSchema<typeof errorSchema>;

// TODO: In principle is not nice I use a repository in the API. We should make a service. Here I'm being lazy. Lets fix clean it up later! (hacking mode). Also this service will use 2 repos: ERC20Repo + balanceRepo
const tokenBalancesService: TokenBalancesService = apiContainer.get(
  tokenBalancesServiceSymbol
);

function parseTokenAddresses(tokens: string): string[] {
  const tokenAddresses = parseEthereumAddressList(tokens.split(','));
  if (tokenAddresses.length === 0) {
    throw new Error('At least one token address is required');
  }

  return tokenAddresses;
}

const root: FastifyPluginAsync = async (fastify): Promise<void> => {
  // REST endpoint for fetching user token balances
  // Example: GET /1/accounts/0x123.../balances?tokens=0xabc...,0xdef...&spender=0x456...
  fastify.get<{
    Params: ParamsSchema;
    Querystring: QuerySchema;
    Reply: SuccessSchema | ErrorSchema;
  }>(
    '/',
    {      
      schema: {
        description: 'Fetches Token balance and allowance for a given user address and token addresses',
        params: paramsSchema,
        querystring: querySchema,
        tags: ['accounts'],
        response: {
          '2XX': successSchema,
          '400': errorSchema,
          '500': errorSchema,
        },
      },
    },
    async function (request, reply) {
      const { chainId, userAddress } = request.params;
      const { tokens } = request.query;

      let tokenAddresses: string[];
      try {
        tokenAddresses = parseTokenAddresses(tokens);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Invalid token addresses';
        reply.code(400).send({ message });
        return;
      }

      try {
        // Fetch balances (includes allowances for Cow Protocol vault relayer)
        const balances = await tokenBalancesService.getUserTokenBalances({
          chainId,
          userAddress,
          tokenAddresses,
        });

        reply.send(balances);

        fastify.log.info(
          `Fetched ${balances.length} token balances for user ${userAddress} on chain ${chainId}`
        );
      } catch (error) {
        fastify.log.error('Error fetching user balances:', error);
        reply.code(500).send({ message: 'Internal server error' });
      }
    }
  );

  // SSE endpoint for real-time balance updates
  fastify.get<{
    Params: ParamsSchema;
    Querystring: QuerySchema;
  }>(
    '/sse',
    {
      schema: {
        description: `Fetches the real-time token balance and allowance for a given user address and token addresses. It sends an initial message with the balances of the requested tokens, and then sends updates when the balances change. You can test this endpoint using the [demo page](/tests/balances).`,
        params: paramsSchema,
        querystring: querySchema,
        tags: ['accounts'],
      },
    },
    async function (
      request: FastifyRequest<{
        Params: ParamsSchema;
        Querystring: QuerySchema;
      }>,
      reply: FastifyReply
    ) {
      const { chainId, userAddress } = request.params;
      const { tokens } = request.query;

      // TODO: This should be done in inversify config, not here. Just quick test
      const sseService: SSEService = apiContainer.get(sseServiceSymbol);
      const balanceTrackingService: BalanceTrackingService = apiContainer.get(
        balanceTrackingServiceSymbol
      );

      let tokenAddresses: string[];
      try {
        tokenAddresses = parseTokenAddresses(tokens);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Invalid token addresses';
        reply.code(400).send({ message });
        return;
      }

      // Set SSE headers
      reply.raw.setHeader('Content-Type', 'text/event-stream');
      reply.raw.setHeader('Cache-Control', 'no-cache');
      reply.raw.setHeader('Connection', 'keep-alive');
      reply.raw.setHeader('Access-Control-Allow-Origin', '*');
      reply.raw.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
      reply.raw.setHeader('X-Accel-Buffering', 'no');

      // Create SSE client
      const clientId = uuidv4();

      const sseClient: SSEClient = {
        clientId: clientId,
        chainId,
        userAddress,
        tokenAddresses,
        send: (data: string) => {
          reply.raw.write(data);
        },
        close: () => {
          try {
            reply.raw.end();
          } catch (error) {
            fastify.log.error(
              `Error closing SSE connection for client ${clientId}:`,
              error
            );
          }
        },
      };

      // Add client to SSE service
      fastify.log.info(`New client ${clientId} connected to SSE service`);
      sseService.addClient(sseClient);

      // Start tracking user balances
      try {
        await balanceTrackingService.startTrackingUser({
          clientId,
          chainId,
          userAddress,
          tokenAddresses,
        });
      } catch (error) {
        fastify.log.error(
          `Error starting balance tracking for clientId=${clientId}:`,
          error
        );
      }

      let isDisconnecting = false;
      const handleDisconnect = async (reason: string) => {
        if (isDisconnecting) {
          return;
        }
        isDisconnecting = true;
        fastify.log.info(`Client ${clientId} disconnected (${reason})`);
        sseService.removeClient(clientId);

        // Stop tracking if no other clients are connected for this user
        const remainingClients = sseService.getClientsForUser(
          chainId,
          userAddress
        );

        if (remainingClients.length === 0) {
          // No more clients. Don't track this user anymore
          try {
            await balanceTrackingService.stopTrackingUser(chainId, userAddress);
          } catch (error) {
            fastify.log.error('Error stopping balance tracking:', error);
          }
        } else {
          // There's more clients for this user. Update the tracked tokens
          const remainingTokens = new Set<string>();
          remainingClients.forEach((client) => {
            client.tokenAddresses.forEach((tokenAddress) => {
              remainingTokens.add(tokenAddress.toLowerCase());
            });
          });

          try {
            await balanceTrackingService.updateTrackedTokens(
              chainId,
              userAddress,
              Array.from(remainingTokens)
            );
          } catch (error) {
            fastify.log.error(error, 'Error updating tracked tokens');
          }
        }
      };

      // Send keep-alive messages every 30 seconds
      const keepAliveInterval = setInterval(() => {
        const didSend = sseService.sendToClient(
          clientId,
          'event: ping\ndata: {}\n\n'
        );
        if (!didSend) {
          clearInterval(keepAliveInterval);
          void handleDisconnect('ping failed');
        }
      }, 30000);

      // Handle client disconnect
      request.raw.on('close', () => {
        clearInterval(keepAliveInterval);
        void handleDisconnect('close');
      });

      // Don't end the response - keep it open for SSE
      return reply;
    }
  );
};

export default root;
