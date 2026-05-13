const MAX_SNAPSHOT_DATE = Date.parse('2026-05-10T00:00:00.000Z')

export function sanitize<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(sanitize).filter((entry) => entry !== undefined) as T
  }

  if (!value || typeof value !== 'object') {
    return value
  }

  if (isAfterMaxSnapshotDate((value as { creation_date?: unknown }).creation_date)) {
    return undefined as T
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== 'lastUpdatedAt')
      .map(([key, entry]) => [key, sanitize(entry)])
      .filter(([, entry]) => entry !== undefined)
  ) as T
}

function isAfterMaxSnapshotDate(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false
  }

  const timestamp = Date.parse(value)

  return Number.isFinite(timestamp) && timestamp > MAX_SNAPSHOT_DATE
}
