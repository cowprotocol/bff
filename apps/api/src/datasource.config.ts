import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

dotenv.config();

export const cowAnalyticsDb = new DataSource({
  type: 'postgres',
  host: process.env.COW_ANALYTICS_DATABASE_HOST,
  port: Number(process.env.COW_ANALYTICS_DATABASE_PORT),
  username: process.env.COW_ANALYTICS_DATABASE_USERNAME,
  password: process.env.COW_ANALYTICS_DATABASE_PASSWORD,
  database: process.env.COW_ANALYTICS_DATABASE_NAME,
  entities: ['src/app/data/*.ts'],
});

cowAnalyticsDb.initialize();
