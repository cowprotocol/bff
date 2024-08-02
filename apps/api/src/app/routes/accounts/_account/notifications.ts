import {
  NotificationModel,
  getNotificationsByAccount,
} from '@cowprotocol/cms-api';
import { FastifyPluginAsync } from 'fastify';
import { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { ETHEREUM_ADDRESS_PATTERN } from '../../../schemas';

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
  // GET /accounts/:account/notifications
  fastify.get<{
    Params: GetNotificationsSchema;
    Reply: NotificationModel[];
  }>(
    '/notifications',
    { schema: { params: routeSchema } },
    async function (request, reply) {
      const account = request.params.account;
      const notifications = await getNotificationsByAccount({ account });
      reply.send(notifications);
    }
  );
};

export default accounts;
