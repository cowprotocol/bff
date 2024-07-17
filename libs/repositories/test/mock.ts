import { FetchResponse } from 'openapi-fetch';

export const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
export const DEFINITELY_NOT_A_TOKEN =
  '0x0000000000000000000000000000000000000000';

const MOCK_RESPONSE: Response = {
  status: 200,
  statusText: 'OK',
  ok: true,
  headers: undefined,
  redirected: false,
  type: 'basic',
  url: 'http://mocked-url.mock',
  body: undefined,
  bodyUsed: false,
  async text() {
    return 'Mock response text';
  },
  arrayBuffer(): Promise<ArrayBuffer> {
    throw new Error('Function not implemented.');
  },
  clone(): Response {
    throw new Error('Function not implemented.');
  },
  blob(): Promise<Blob> {
    throw new Error('Function not implemented.');
  },
  formData(): Promise<FormData> {
    throw new Error('Function not implemented.');
  },
  json(): Promise<any> {
    throw new Error('Function not implemented.');
  },
};

interface OkResponseParams extends Partial<Omit<Response, 'data'>> {
  data: unknown;
}

export function okResponse(params: OkResponseParams): {
  data: unknown;
  response: Response;
} {
  const { status, data, ...overrides } = params;
  return {
    response: {
      ...MOCK_RESPONSE,
      ...overrides,
      status: 200,
      ok: true,
    },
    data,
  };
}

interface ErrorResponseParams extends Partial<Omit<Response, 'status'>> {
  status: number;
  error: unknown;
}

export function errorResponse(params: ErrorResponseParams): {
  response: Response;
  error?: unknown;
} {
  const { status, error, ...overrides } = params;
  return {
    response: {
      ...MOCK_RESPONSE,
      ...overrides,
      status,
      ok: false,
    },
    error,
  };
}
