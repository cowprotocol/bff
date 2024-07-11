import createClient from 'openapi-fetch';

const COW_API_BASE_URL = process.env.COW_API_BASE_URL || 'https://api.cow.fi';

import type { paths } from './gen/cow/cow-api-types';

export const cowApiClient = createClient<paths>({
  baseUrl: COW_API_BASE_URL,
});
