const DEFAULT_TIME_ZONE = import.meta.env.VITE_DISPLAY_TIME_ZONE || 'Asia/Manila';
const SQLITE_UTC_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/;
const TIMEZONE_SUFFIX_PATTERN = /(?:Z|[+-]\d{2}:?\d{2})$/i;

export function parseUtcTimestamp(value: string | number | Date | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const timestamp = String(value).trim();
  const normalized = SQLITE_UTC_TIMESTAMP_PATTERN.test(timestamp)
    ? `${timestamp.replace(' ', 'T')}Z`
    : TIMEZONE_SUFFIX_PATTERN.test(timestamp)
      ? timestamp
      : timestamp.includes('T')
        ? `${timestamp}Z`
        : timestamp;
  const date = new Date(normalized);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatManilaDate(
  value: string | number | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {},
) {
  const date = parseUtcTimestamp(value);

  return date
    ? new Intl.DateTimeFormat('en-PH', {
        timeZone: DEFAULT_TIME_ZONE,
        ...options,
      }).format(date)
    : '';
}

export function getTimestamp(value: string | number | Date | null | undefined) {
  return parseUtcTimestamp(value)?.getTime() ?? 0;
}
