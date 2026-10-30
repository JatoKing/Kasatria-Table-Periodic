import type { PeopleData, Person } from './types';

/** Expected header names after normalisation (trimmed, single-spaced, lower case). */
const COLUMNS = {
  name: 'name',
  photo: 'photo',
  age: 'age',
  country: 'country',
  interest: 'interest',
  netWorth: 'net worth',
} as const;

type ColumnKey = keyof typeof COLUMNS;

const COLUMN_LABELS: Record<ColumnKey, string> = {
  name: 'Name',
  photo: 'Photo',
  age: 'Age',
  country: 'Country',
  interest: 'Interest',
  netWorth: 'Net Worth',
};

export class SheetFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SheetFormatError';
  }
}

/** " Net  Worth " → "net worth". The original CSV header has stray spaces around it. */
export function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function toText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

/** Accepts 251260.8 or "$251,260.80". Returns null when the value is not a number. */
export function parseMoney(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;

  const cleaned = value.replace(/[^0-9.-]/g, '');
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null;

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseAge(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
  }
  if (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value.trim())) {
    return Math.round(Number(value.trim()));
  }
  return null;
}

/** Only http(s) URLs are used as image sources. */
export function parseHttpUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

function resolveColumns(headerRow: readonly unknown[]): Record<ColumnKey, number> {
  const headers = headerRow.map(normalizeHeader);
  const keys = Object.keys(COLUMNS) as ColumnKey[];
  const missing = keys.filter((key) => !headers.includes(COLUMNS[key]));

  if (missing.length > 0) {
    const labels = missing.map((key) => COLUMN_LABELS[key]).join(', ');
    throw new SheetFormatError(`The sheet is missing these columns: ${labels}.`);
  }

  return Object.fromEntries(keys.map((key) => [key, headers.indexOf(COLUMNS[key])])) as Record<
    ColumnKey,
    number
  >;
}

/**
 * Turns raw Sheets API rows into people. Columns are matched by header name, not position,
 * so reordering columns in the sheet does not break the app.
 *
 * Row numbers assume the range starts at row 1 (the header row), as in "'Data Template'!A:F".
 */
export function parsePeopleRows(rows: readonly (readonly unknown[])[]): PeopleData {
  if (rows.length === 0) {
    throw new SheetFormatError(
      'The sheet is empty. Add the header row (Name, Photo, Age, Country, Interest, Net Worth) and the data below it.',
    );
  }

  const [headerRow, ...dataRows] = rows;
  const column = resolveColumns(headerRow);
  const people: Person[] = [];
  const skippedRows: number[] = [];

  dataRows.forEach((row, index) => {
    const rowNumber = index + 2;

    // The API drops trailing empty cells, so blank rows arrive as [] or as empty strings.
    if (row.every((cell) => toText(cell) === '')) return;

    const name = toText(row[column.name]);
    const netWorth = parseMoney(row[column.netWorth]);

    if (!name || netWorth === null) {
      skippedRows.push(rowNumber);
      return;
    }

    people.push({
      id: `row-${rowNumber}`,
      name,
      photoUrl: parseHttpUrl(row[column.photo]),
      age: parseAge(row[column.age]),
      country: toText(row[column.country]).toUpperCase(),
      interest: toText(row[column.interest]),
      netWorth,
    });
  });

  return { people, skippedRows };
}
