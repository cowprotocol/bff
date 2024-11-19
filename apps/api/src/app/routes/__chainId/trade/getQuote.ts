import { FastifyPluginAsync } from 'fastify';

import { FromSchema } from 'json-schema-to-ts';
import { apiContainer } from '../../../inversify.config';
import {
  TradingService,
  tradingServiceSymbol
} from '@cowprotocol/services';

import { serializeQuoteAmountsAndCosts } from './serializeQuoteAmountsAndCosts';
import { bodySchema, errorSchema, routeSchema, successSchema } from './schemas';


type RouteSchema = FromSchema<typeof routeSchema>;
type SuccessSchema = FromSchema<typeof successSchema>;
type BodySchema = FromSchema<typeof bodySchema>;
type ErrorSchema = FromSchema<typeof errorSchema>;

const tradingService: TradingService = apiContainer.get(
  tradingServiceSymbol
);

const root: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.post<{
    Params: RouteSchema;
    Reply: SuccessSchema | ErrorSchema;
    Body: BodySchema;
  }>(
    '/getQuote',
    {
      schema: {
        body: bodySchema,
        response: {
          '2XX': successSchema,
          '400': errorSchema,
        },
      },
    },
    async function (request, reply) {
      const { chainId } = request.params;

      const { trader, params } = request.body

      try {
        const result = await tradingService.getQuote(
          {
            ...trader as Parameters<typeof tradingService.getQuote>[0],
            chainId
          },
          params as Parameters<typeof tradingService.getQuote>[1]
        );

        reply.send({
          ...result,
          amountsAndCosts: serializeQuoteAmountsAndCosts(result.amountsAndCosts)
        });
      } catch (e) {
        reply.code(500).send({ message: (e as Error).message });
      }
    }
  );
};

export default root;