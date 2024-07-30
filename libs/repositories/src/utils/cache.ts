export type PartialCacheKey = string | number | boolean;

export function getCacheKey(...params: PartialCacheKey[]) {
  return params.map((param) => param.toString().toLowerCase()).join(':');
}
