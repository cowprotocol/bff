import { FastifyPluginAsync } from 'fastify';

import { FromSchema } from 'json-schema-to-ts';
import { apiContainer } from '../../inversify.config';
import {
  TradingService,
  tradingServiceSymbol
} from '@cowprotocol/services';

import { errorSchema, postOrderBodySchema, postOrderSuccessSchema } from './schemas';
import { getErrorMessage } from './utils';

type SuccessSchema = FromSchema<typeof postOrderSuccessSchema>;
type BodySchema = FromSchema<typeof postOrderBodySchema>;
type ErrorSchema = FromSchema<typeof errorSchema>;

const tradingService: TradingService = apiContainer.get(
  tradingServiceSymbol
);

const root: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.post<{
    Reply: SuccessSchema | ErrorSchema;
    Body: BodySchema;
  }>(
    '/postOrder',
    {
      schema: {
        body: postOrderBodySchema,
        response: {
          '2XX': postOrderSuccessSchema,
          '400': errorSchema,
        },
      },
    },
    async function (request, reply) {
      const { trader, quoteResponse, orderTypedData, appDataInfo, signature } = request.body

      try {
        const orderId = await tradingService.postOrder(
          trader,
          quoteResponse as Parameters<typeof tradingService.postOrder>[1],
          orderTypedData as Parameters<typeof tradingService.postOrder>[2],
          appDataInfo,
          signature
        );

        reply.send({ orderId });
      } catch (e) {
        const errorMessage = getErrorMessage(e)
        console.error('[Trading API] postOrder error', errorMessage)
        reply.code(500).send({ message: errorMessage });
      }
    }
  );
};

export default root;