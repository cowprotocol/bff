export const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
export const DEFINITELY_NOT_A_TOKEN =
  '0x0000000000000000000000000000000000000000';

export function okResponse(data: unknown) {
  return {
    response: {
      status: 200,
      ok: true,
    },
    url: '',
    data,
  };
}
