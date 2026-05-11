const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

type ISODateParts = {
  year: number;
  month: number;
  day: number;
};

export function getCurrentThaiCalendarYear() {
  return new Date().getFullYear() + 543;
}

export function getCurrentThaiFiscalYear(date = new Date()) {
  return date.getMonth() >= 9 ? date.getFullYear() + 544 : date.getFullYear() + 543;
}

export function parseISODateParts(value: string | null | undefined): ISODateParts | null {
  const match = ISO_DATE_PATTERN.exec(value || '');

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!year || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  return { year, month, day };
}

export function getMonthFromISODate(value: string | null | undefined) {
  return parseISODateParts(value)?.month || 0;
}

export function getThaiFiscalYearFromISODate(value: string | null | undefined) {
  const parts = parseISODateParts(value);

  if (!parts) {
    return 0;
  }

  return parts.month >= 10 ? parts.year + 544 : parts.year + 543;
}

function parseISODateAsUTC(value: string | null | undefined) {
  const parts = parseISODateParts(value);

  if (!parts) {
    return null;
  }

  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

export function formatThaiDate(value: string | null | undefined, fallback = '-') {
  const date = parseISODateAsUTC(value);

  if (!date) {
    return fallback;
  }

  return new Intl.DateTimeFormat('th-TH-u-ca-buddhist', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function formatThaiLongDate(value: string | null | undefined, fallback = '-') {
  const date = parseISODateAsUTC(value);

  if (!date) {
    return fallback;
  }

  return new Intl.DateTimeFormat('th-TH-u-ca-buddhist', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
