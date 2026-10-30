import { describe, expect, it } from 'vitest';
import {
  normalizeHeader,
  parseAge,
  parseHttpUrl,
  parseMoney,
  parsePeopleRows,
  SheetFormatError,
} from './parse-people';

const HEADER = ['Name', 'Photo', 'Age', 'Country', 'Interest', ' Net Worth '];

describe('normalizeHeader', () => {
  it('trims, collapses spaces and lower-cases', () => {
    expect(normalizeHeader(' Net  Worth ')).toBe('net worth');
    expect(normalizeHeader(undefined)).toBe('');
  });
});

describe('parseMoney', () => {
  it.each([
    [251260.8, 251260.8],
    ['$251,260.80', 251260.8],
    ['60393.6', 60393.6],
    ['', null],
    ['$', null],
    ['abc', null],
    [Number.NaN, null],
    [null, null],
  ])('parses %j as %j', (input, expected) => {
    expect(parseMoney(input)).toBe(expected);
  });
});

describe('parseAge', () => {
  it.each([
    [25, 25],
    ['30', 30],
    [' 41 ', 41],
    ['thirty', null],
    [-1, null],
    [undefined, null],
  ])('parses %j as %j', (input, expected) => {
    expect(parseAge(input)).toBe(expected);
  });
});

describe('parseHttpUrl', () => {
  it('keeps http and https URLs', () => {
    expect(parseHttpUrl('https://static.kasatria.com/pivot-img/photo/019.jpg')).toBe(
      'https://static.kasatria.com/pivot-img/photo/019.jpg',
    );
  });

  it('rejects other protocols and invalid values', () => {
    expect(parseHttpUrl('javascript:alert(1)')).toBeNull();
    expect(parseHttpUrl('not a url')).toBeNull();
    expect(parseHttpUrl('')).toBeNull();
    expect(parseHttpUrl(42)).toBeNull();
  });
});

describe('parsePeopleRows', () => {
  it('maps rows by header name, including formatted and unformatted values', () => {
    const result = parsePeopleRows([
      HEADER,
      ['Lee Siew Suan', 'https://static.kasatria.com/pivot-img/photo/019.jpg', 25, 'CN', 'Writing', 251260.8],
      ['New Yee Chian', 'https://static.kasatria.com/pivot-img/photo/020.jpg', '23', 'cn', 'Cooking', '$60,393.60'],
    ]);

    expect(result.skippedRows).toEqual([]);
    expect(result.people).toEqual([
      {
        id: 'row-2',
        name: 'Lee Siew Suan',
        photoUrl: 'https://static.kasatria.com/pivot-img/photo/019.jpg',
        age: 25,
        country: 'CN',
        interest: 'Writing',
        netWorth: 251260.8,
      },
      {
        id: 'row-3',
        name: 'New Yee Chian',
        photoUrl: 'https://static.kasatria.com/pivot-img/photo/020.jpg',
        age: 23,
        country: 'CN',
        interest: 'Cooking',
        netWorth: 60393.6,
      },
    ]);
  });

  it('does not depend on column order', () => {
    const { people } = parsePeopleRows([
      ['Net Worth', 'Country', 'Name', 'Interest', 'Age', 'Photo'],
      [150000, 'MY', 'Farah', 'Cooking', 45, ''],
    ]);
    expect(people[0]).toMatchObject({ name: 'Farah', country: 'MY', netWorth: 150000, photoUrl: null });
  });

  it('skips rows without a name or net worth and ignores blank rows', () => {
    const result = parsePeopleRows([
      HEADER,
      ['Valid', '', 30, 'US', 'Hiking', 1000],
      [],
      ['', '', 30, 'US', 'Hiking', 1000],
      ['No Worth', '', 30, 'US', 'Hiking', ''],
      ['Short row'],
    ]);

    expect(result.people.map((person) => person.name)).toEqual(['Valid']);
    expect(result.skippedRows).toEqual([4, 5, 6]);
  });

  it('reports missing columns', () => {
    expect(() => parsePeopleRows([['Name', 'Photo', 'Age']])).toThrow(SheetFormatError);
    expect(() => parsePeopleRows([['Name', 'Photo', 'Age']])).toThrow(
      'The sheet is missing these columns: Country, Interest, Net Worth.',
    );
  });

  it('rejects an empty sheet', () => {
    expect(() => parsePeopleRows([])).toThrow(SheetFormatError);
  });
});
