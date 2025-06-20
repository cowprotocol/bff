import { FastifyPluginAsync } from 'fastify';
import { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { ETHEREUM_ADDRESS_PATTERN } from '../../../schemas';
import {
  CACHE_CONTROL_HEADER,
  getCacheControlHeaderValue,
} from '../../../../utils/cache';
import ms from 'ms';
import {
  isCmsEnabled,
  NotificationModel,
  PushSubscriptionsRepository,
  pushSubscriptionsRepositorySymbol,
} from '@cowprotocol/repositories';
import { apiContainer } from '../../../inversify.config';
import { logger } from '@cowprotocol/shared';

const CACHE_SECONDS = ms('5m') / 1000;

const routeSchema = {
  type: 'object',
  required: ['account'],
  properties: {
    account: {
      title: 'account',
      description: 'Account of the user',
      type: 'string',
      pattern: ETHEREUM_ADDRESS_PATTERN,
    },
  },
} as const satisfies JSONSchema;

type RouteSchema = FromSchema<typeof routeSchema>;

type GetNotificationsSchema = RouteSchema;

const accounts: FastifyPluginAsync = async (fastify): Promise<void> => {
  if (!isCmsEnabled) {
    logger.warn(
      'CMS is not enabled. Please check CMS_ENABLED and CMS_API_KEY environment variables'
    );

    return;
  }

  const pushSubscriptionsRepository: PushSubscriptionsRepository =
    apiContainer.get(pushSubscriptionsRepositorySymbol);

  // GET /accounts/:account/notifications
  fastify.get<{
    Params: GetNotificationsSchema;
    Reply: NotificationModel[];
  }>(
    '/notifications',
    {
      schema: {
        description: 'Get notifications for an account',
        tags: ['accounts'],
        params: routeSchema,
      },
    },
    async function (request, reply) {
      reply.header(
        CACHE_CONTROL_HEADER,
        getCacheControlHeaderValue(CACHE_SECONDS)
      );

      const account = request.params.account;
      const notifications =
        await pushSubscriptionsRepository.getNotificationsByAccount({
          account,
        });
      reply.send(notifications);
    }
  );
};

export default accounts;
