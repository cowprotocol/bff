import { FetchResponse } from 'openapi-fetch';

export const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
export const DEFINITELY_NOT_A_TOKEN =
  '0x0000000000000000000000000000000000000000';

const MOCK_RESPONSE: Response = {
  status: 200,
  ok: true,
  headers: undefined,
  redirected: false,
  statusText: '',
  type: 'error',
  url: '',
  clone: function (): Response {
    throw new Error('Function not implemented.');
  },
  body: undefined,
  bodyUsed: false,
  arrayBuffer: function (): Promise<ArrayBuffer> {
    throw new Error('Function not implemented.');
  },
  blob: function (): Promise<Blob> {
    throw new Error('Function not implemented.');
  },
  formData: function (): Promise<FormData> {
    throw new Error('Function not implemented.');
  },
  json: function (): Promise<any> {
    throw new Error('Function not implemented.');
  },
  text: function (): Promise<string> {
    throw new Error('Function not implemented.');
  },
};

export function okResponse(
  data: unknown,
  overrides?: Partial<Response>
): {
  data: unknown;
  response: Response;
} {
  return {
    response: {
      ...MOCK_RESPONSE,
      status: 200,
      ok: true,
      ...overrides,
    },
    data,
  };
}

export function errorResponse(
  status: number,
  data?: unknown,
  overrides?: Partial<Response>
): {
  response: Response;
  data?: unknown;
} {
  return {
    response: {
      ...MOCK_RESPONSE,
      status,
      ok: false,
      ...overrides,
    },
    data,
  };
}
