export type PartialCacheKey = string | number | boolean;

export function getCacheKey(...params: PartialCacheKey[]) {
  return params
    .filter((item) => item !== '')
    .map((param) => param.toString().toLowerCase())
    .join(':');
}
