import { FastifyPluginAsync } from 'fastify';
import { server } from '../../../../main';
import {
  CACHE_CONTROL_HEADER,
  getCacheControlHeaderValue,
} from '../../../../utils/cache';
import ms from 'ms';
import { ValuePoint } from '../orders/types';

const CACHE_SECONDS = ms('10m') / 1000;

// Prometheus configuration
const PROMETHEUS_URL = process.env.PROMETHEUS_URL;
const PROMETHEUS_USERNAME = process.env.PROMETHEUS_USERNAME;
const PROMETHEUS_PASSWORD = process.env.PROMETHEUS_PASSWORD;
const GAS_PRICE_QUERY = 'gp_v2_api_gas_price{network="mainnet"}';
const DEFAULT_STEP = '5m'; // Default step interval
const DEFAULT_RANGE = '24h'; // Default time range

interface GasPriceDataPoint {
  time: number;
  value: string;
}

interface GasPriceResponse {
  data: GasPriceDataPoint[];
}

interface PrometheusResponse {
  status: string;
  data: {
    resultType: string;
    result: Array<{
      metric: Record<string, string>;
      values: Array<[number, string]>;
    }>;
  };
}

/**
 * Fetches gas price data from Prometheus using query_range
 */
export async function fetchGasPriceFromPrometheus(
  range: string = DEFAULT_RANGE,
  step: string = DEFAULT_STEP
): Promise<ValuePoint[] | undefined> {
  try {
    const query = encodeURIComponent(GAS_PRICE_QUERY);
    const url = `${PROMETHEUS_URL}/api/v1/query_range?query=${query}&start=${getStartTime(
      range
    )}&end=${Math.floor(Date.now() / 1000)}&step=${step}`;

    server.log.debug(`Fetching gas price from Prometheus: ${url}`);

    // Prepare fetch options with authentication if credentials are provided
    const fetchOptions: RequestInit = {};

    if (PROMETHEUS_USERNAME && PROMETHEUS_PASSWORD) {
      const authHeader =
        'Basic ' +
        Buffer.from(`${PROMETHEUS_USERNAME}:${PROMETHEUS_PASSWORD}`).toString(
          'base64'
        );
      fetchOptions.headers = {
        Authorization: authHeader,
      };
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      server.log.error(
        `Failed to fetch gas price from Prometheus: ${response.statusText}`
      );
      return undefined;
    }

    const data = (await response.json()) as PrometheusResponse;

    if (data.status !== 'success' || !data.data.result.length) {
      return undefined;
    }

    const result = data.data.result[0];
    const values = result.values;

    if (!values || values.length === 0) {
      return undefined;
    }

    // Format data points
    const dataPoints = values.map(([timestamp, value]) => ({
      time: Math.floor(timestamp),
      value,
    }));

    return dataPoints;
  } catch (error) {
    server.log.error(
      `Error fetching gas price from Prometheus: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
    return undefined;
  }
}

/**
 * Calculate the start time based on the range
 */
function getStartTime(range: string): number {
  const now = Math.floor(Date.now() / 1000);
  const rangeMs = ms(range);
  return now - Math.floor(rangeMs / 1000);
}

const gasPrice: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get<{
    Reply: GasPriceResponse;
    Querystring: {
      range?: string;
      step?: string;
    };
  }>(
    '/gasPrice',
    {
      schema: {
        description: 'Get the gas price for a given chain',
        tags: ['gas'],
        querystring: {
          type: 'object',
          properties: {
            range: {
              type: 'string',
              description: 'Time range to fetch data for (e.g. 1h, 24h, 7d)',
              default: DEFAULT_RANGE,
            },
            step: {
              type: 'string',
              description: 'Step interval (e.g. 1m, 5m, 1h)',
              default: DEFAULT_STEP,
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    time: { type: 'number' },
                    value: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async function (request, reply) {
      reply.header(
        CACHE_CONTROL_HEADER,
        getCacheControlHeaderValue(CACHE_SECONDS)
      );

      const { range, step } = request.query;

      // Fetch gas price data from Prometheus
      const gasPriceData = await fetchGasPriceFromPrometheus(range, step);

      if (!gasPriceData) {
        return reply.send({ data: [] });
      }

      return reply.send({
        data: gasPriceData,
      });
    }
  );
};

export default gasPrice;
