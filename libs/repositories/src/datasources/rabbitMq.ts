import { ensureEnvs } from '@cowprotocol/shared';
import amqp from 'amqplib';

const REQUIRED_ENVS = ['QUEUE_HOST', 'QUEUE_USER', 'QUEUE_PASSWORD'];

export async function createRabbitMqConnection() {
  ensureEnvs(REQUIRED_ENVS);

  return amqp.connect({
    hostname: process.env.QUEUE_HOST,
    port: Number(process.env.QUEUE_PORT || '5672'),
    username: process.env.QUEUE_USER,
    password: process.env.QUEUE_PASSWORD,
  });
}
