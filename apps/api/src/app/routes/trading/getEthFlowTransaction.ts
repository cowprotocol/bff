import { FastifyPluginAsync } from 'fastify';

import { FromSchema } from 'json-schema-to-ts';
import { apiContainer } from '../../inversify.config';
import {
  TradingService,
  tradingServiceSymbol
} from '@cowprotocol/services';

import { errorSchema, ethFlowTxBodySchema, ethFlowTxSuccessSchema } from './schemas';
import { getErrorMessage } from './utils';
import { deserializeQuoteAmountsAndCosts } from './mapQuoteAmountsAndCosts';

type SuccessSchema = FromSchema<typeof ethFlowTxSuccessSchema>;
type BodySchema = FromSchema<typeof ethFlowTxBodySchema>;
type ErrorSchema = FromSchema<typeof errorSchema>;

const tradingService: TradingService = apiContainer.get(
  tradingServiceSymbol
);

const root: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.post<{
    Reply: SuccessSchema | ErrorSchema;
    Body: BodySchema;
  }>(
    '/sell-native-currency-requests',
    {
      schema: {
        body: ethFlowTxBodySchema,
        response: {
          '2XX': ethFlowTxSuccessSchema,
          '400': errorSchema,
        },
      },
    },
    async function (request, reply) {
      const { trader, amountsAndCosts, quoteId, tradeParameters, appDataInfo } = request.body

      try {
        const result = await tradingService.getEthFlowTransaction(
          trader,
          quoteId,
          tradeParameters as Parameters<typeof tradingService.getEthFlowTransaction>[2],
          deserializeQuoteAmountsAndCosts(amountsAndCosts),
          appDataInfo,
        );

        reply.send(result);
      } catch (e) {
        const errorMessage = getErrorMessage(e)
        console.error('[Trading API] getEthFlowTransaction error', errorMessage)
        reply.code(500).send({ message: errorMessage });
      }
    }
  );
};

export default root;