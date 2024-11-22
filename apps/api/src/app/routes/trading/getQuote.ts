import { FastifyPluginAsync } from 'fastify';

import { FromSchema } from 'json-schema-to-ts';
import { apiContainer } from '../../inversify.config';
import {
  TradingService,
  tradingServiceSymbol
} from '@cowprotocol/services';

import { serializeQuoteAmountsAndCosts } from './serializeQuoteAmountsAndCosts';
import { bodySchema, errorSchema, successSchema } from './schemas';
import type { OrderPostError } from '@cowprotocol/cow-sdk';

type SuccessSchema = FromSchema<typeof successSchema>;
type BodySchema = FromSchema<typeof bodySchema>;
type ErrorSchema = FromSchema<typeof errorSchema>;

const isOrderPostError = (e: any): e is OrderPostError => e.errorType && e.description;

const getErrorMessage = (e: any): string => {
  if (e.body && isOrderPostError(e.body)) {
    return e.body.description;
  }

  return e.message || JSON.stringify(e);
}

const tradingService: TradingService = apiContainer.get(
  tradingServiceSymbol
);

const root: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.post<{
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
      const { trader, params } = request.body

      try {
        const result = await tradingService.getQuote(
          trader as Parameters<typeof tradingService.getQuote>[0],
          params as Parameters<typeof tradingService.getQuote>[1]
        );

        reply.send({
          ...result,
          amountsAndCosts: serializeQuoteAmountsAndCosts(result.amountsAndCosts)
        });
      } catch (e) {
        const errorMessage = getErrorMessage(e)
        console.error('[Trading API] getQuote error', errorMessage)
        reply.code(500).send({ message: errorMessage });
      }
    }
  );
};

export default root;