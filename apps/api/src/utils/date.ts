/**
 * Returns start and end timestamps for a given date's 24-hour period, optionally adjusted for timezone
 * @param date Date
 * @returns Object containing start and end timestamps in seconds
 */
export function get24HourRange(date: Date) {
  // Start of day
  const start = getStartOfDay(date);

  // End of day (start + 24 hours - 1 millisecond)
  const end = getEndOfDay(date);

  return {
    start: Math.floor(start.getTime() / 1000),
    end: Math.floor(end.getTime() / 1000),
  };
}

function getStartOfDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  return start;
}

function getEndOfDay(date: Date): Date {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return end;
}

/**
 * Converts a string or Date object to a Date, optionally adjusting for timezone
 * @param date Date string or Date object to convert
 * @param timezone Optional timezone (e.g. 'America/New_York', 'Europe/Berlin'). Defaults to UTC
 * @returns Date object in the specified timezone (or UTC if no timezone provided)
 */

function toDate(date: string | Date, timezone?: string): Date {
  return timezone
    ? new Date(date.toLocaleString('en-US', { timeZone: timezone }))
    : new Date(date);
}
