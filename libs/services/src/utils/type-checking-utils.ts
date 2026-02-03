export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumeric(value: unknown): value is number | string {
  if (typeof value === 'number') {
    return !Number.isNaN(value);
  }

  if (typeof value === 'string') {
    return value.trim().length > 0 && !Number.isNaN(Number(value));
  }

  return false;
}

export function toNumber(value: number | string, field: string): number {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid numeric value for ${field}: ${value}`);
  }

  return parsed;
}
