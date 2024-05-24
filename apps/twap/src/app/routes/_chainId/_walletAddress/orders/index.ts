import { FastifyInstance } from 'fastify';
import { Wallet } from '../../../../data/wallet';
import { Order } from '../../../../data/order';
import { FromSchema, JSONSchema } from 'json-schema-to-ts';

const ADDRESS_LENGTH = 42;

const routeSchema = {
  type: 'object',
  required: ['chainId', 'walletAddress'],
  additionalProperties: false,
  properties: {
    chainId: {
      enum: ['1', '5', '100'],
    },
    walletAddress: {
      type: 'string',
      minLength: ADDRESS_LENGTH,
      maxLength: ADDRESS_LENGTH,
    },
  },
} as const satisfies JSONSchema;
type RouteSchema = FromSchema<typeof routeSchema>;

const postOrderBodySchema = {
  type: 'object',
  required: ['order', 'safeTxHash'],
  additionalProperties: false,
  properties: {
    order: {
      type: 'object',
      required: [
        'sellToken',
        'buyToken',
        'receiver',
        'partSellAmount',
        'minPartLimit',
        't0',
        'n',
        't',
        'span',
        'appData',
      ],
      additionalProperties: false,
      properties: {
        sellToken: {
          type: 'string',
          minLength: ADDRESS_LENGTH,
          maxLength: ADDRESS_LENGTH,
        },
        buyToken: {
          type: 'string',
          minLength: ADDRESS_LENGTH,
          maxLength: ADDRESS_LENGTH,
        },
        receiver: {
          type: 'string',
          minLength: ADDRESS_LENGTH,
          maxLength: ADDRESS_LENGTH,
        },
        partSellAmount: {
          type: 'string',
        },
        minPartLimit: {
          type: 'string',
        },
        t0: {
          type: 'number',
        },
        n: {
          type: 'number',
        },
        t: {
          type: 'number',
        },
        span: {
          type: 'number',
        },
        appData: {
          type: 'string',
        },
      },
    },
    safeTxHash: {
      type: 'string',
    },
  },
} as const satisfies JSONSchema;
type PostOrderBodySchema = FromSchema<typeof postOrderBodySchema>;
type PostOrderParamsSchema = RouteSchema;

type GetOrdersParamsSchema = RouteSchema;

export default async function (fastify: FastifyInstance) {
  fastify.get<{
    Params: GetOrdersParamsSchema;
  }>(
    '/',
    {
      schema: {
        params: routeSchema,
      },
    },
    async function (request, reply) {
      const { chainId, walletAddress } = request.params;
      const orderRepository = fastify.orm.getRepository(Order);

      const orders = await orderRepository.find({
        where: {
          wallet: {
            address: walletAddress,
          },
          chainId: Number(chainId),
        },
        relations: {
          wallet: true,
        },
      });

      reply.status(200).send(orders);
    }
  );

  fastify.post<{ Body: PostOrderBodySchema; Params: PostOrderParamsSchema }>(
    '/',
    {
      schema: {
        params: routeSchema,
        body: postOrderBodySchema,
      },
    },
    async function (request, reply) {
      const { chainId, walletAddress } = request.params;
      const walletRepository = fastify.orm.getRepository(Wallet);
      const orderRepository = fastify.orm.getRepository(Order);

      let wallet = await walletRepository.findOne({
        where: {
          address: walletAddress,
        },
      });

      if (wallet === null) {
        wallet = walletRepository.create({
          address: walletAddress,
        });

        await walletRepository.save(wallet);
      }

      const order = orderRepository.create({
        ...request.body.order,
        wallet,
        chainId: Number(chainId),
      });

      await orderRepository.save(order);

      reply.status(200).send(order);
    }
  );
}
