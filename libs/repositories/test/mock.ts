import type { Headers, Response } from 'node-fetch';

export const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
export const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';

const MOCK_RESPONSE: Response = {
  status: 200,
  statusText: 'OK',
  ok: true,
  headers: new globalThis.Headers() as unknown as Headers,
  redirected: false,
  type: 'basic',
  url: 'http://mocked-url.mock',
  body: null,
  bodyUsed: false,
  size: 0,
  buffer(): Promise<Buffer> {
    throw new Error('Function not implemented.');
  },
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
  json(): Promise<unknown> {
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
    } as Response,
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
    } as Response,
    error,
  };
}
