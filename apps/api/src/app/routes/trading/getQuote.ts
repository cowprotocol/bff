import { FastifyPluginAsync } from 'fastify';

import { FromSchema } from 'json-schema-to-ts';
import { apiContainer } from '../../inversify.config';
import {
  TradingService,
  tradingServiceSymbol
} from '@cowprotocol/services';

import { serializeQuoteAmountsAndCosts } from './mapQuoteAmountsAndCosts';
import { errorSchema, getQuoteBodySchema, getQuoteSuccessSchema } from './schemas';
import { getErrorMessage } from './utils';

type SuccessSchema = FromSchema<typeof getQuoteSuccessSchema>;
type BodySchema = FromSchema<typeof getQuoteBodySchema>;
type ErrorSchema = FromSchema<typeof errorSchema>;

const tradingService: TradingService = apiContainer.get(
  tradingServiceSymbol
);

const root: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.post<{
    Reply: SuccessSchema | ErrorSchema;
    Body: BodySchema;
  }>(
    '/quote-requests',
    {
      schema: {
        body: getQuoteBodySchema,
        response: {
          '2XX': getQuoteSuccessSchema,
          '400': errorSchema,
        },
      },
    },
    async function (request, reply) {
      const { trader, params, advancedSettings } = request.body

      try {
        const result = await tradingService.getQuote(
          trader as Parameters<typeof tradingService.getQuote>[0],
          params as Parameters<typeof tradingService.getQuote>[1],
          advancedSettings as Parameters<typeof tradingService.getQuote>[2]
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