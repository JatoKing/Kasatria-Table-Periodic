import { describe, expect, it, vi } from 'vitest';
import { cleanEnvValue, ConfigError, DEFAULT_SHEET_RANGE, getAppConfig, requireEnvValue } from './app-config';
import { getServerConfig, normalizePrivateKey } from './server-config';

function stubServerEnv(overrides: Record<string, string> = {}): void {
  const values: Record<string, string> = {
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: 'client-123.apps.googleusercontent.com',
    SPREADSHEET_ID: 'sheet-123',
    SHEET_RANGE: '',
    GOOGLE_SERVICE_ACCOUNT_EMAIL: 'reader@project.iam.gserviceaccount.com',
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n',
    ...overrides,
  };
  for (const [name, value] of Object.entries(values)) vi.stubEnv(name, value);
}

describe('cleanEnvValue', () => {
  it.each([
    ['  abc  ', 'abc'],
    ['"abc"', 'abc'],
    ["'abc'", 'abc'],
    [`"'Data Template'!A:F"`, "'Data Template'!A:F"],
    ["'Data Template'!A:F", "'Data Template'!A:F"],
    [`"'abc'"`, "'abc'"],
    ['"', '"'],
    ['', ''],
    [undefined, ''],
  ])('cleans %j to %j', (input, expected) => {
    expect(cleanEnvValue(input)).toBe(expected);
  });
});

describe('requireEnvValue', () => {
  it('returns the cleaned value', () => {
    expect(requireEnvValue('SPREADSHEET_ID', ' "sheet-123" ')).toBe('sheet-123');
  });

  it('names the missing variable', () => {
    expect(() => requireEnvValue('SPREADSHEET_ID', '  ')).toThrow(ConfigError);
    expect(() => requireEnvValue('SPREADSHEET_ID', undefined)).toThrow(/SPREADSHEET_ID/);
  });
});

describe('normalizePrivateKey', () => {
  it('turns literal \\n sequences into line breaks', () => {
    expect(normalizePrivateKey('-----BEGIN-----\\nabc\\n-----END-----')).toBe('-----BEGIN-----\nabc\n-----END-----');
  });

  it('leaves real line breaks alone', () => {
    expect(normalizePrivateKey('a\nb')).toBe('a\nb');
  });
});

describe('getAppConfig', () => {
  it('reads only the OAuth client ID', () => {
    stubServerEnv();
    expect(getAppConfig()).toEqual({ googleClientId: 'client-123.apps.googleusercontent.com' });
  });

  it('names NEXT_PUBLIC_GOOGLE_CLIENT_ID when it is missing', () => {
    stubServerEnv({ NEXT_PUBLIC_GOOGLE_CLIENT_ID: '' });
    expect(() => getAppConfig()).toThrow(/NEXT_PUBLIC_GOOGLE_CLIENT_ID/);
  });
});

describe('getServerConfig', () => {
  it('reads every server value and normalises the private key', () => {
    stubServerEnv({ SHEET_RANGE: `"'People'!A:F"` });
    expect(getServerConfig()).toEqual({
      googleClientId: 'client-123.apps.googleusercontent.com',
      spreadsheetId: 'sheet-123',
      sheetRange: "'People'!A:F",
      serviceAccountEmail: 'reader@project.iam.gserviceaccount.com',
      serviceAccountPrivateKey: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n',
    });
  });

  it('falls back to the default range', () => {
    stubServerEnv();
    expect(getServerConfig().sheetRange).toBe(DEFAULT_SHEET_RANGE);
  });

  it.each(['SPREADSHEET_ID', 'GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY'])(
    'names %s when it is missing',
    (name) => {
      stubServerEnv({ [name]: '' });
      expect(() => getServerConfig()).toThrow(new RegExp(name));
    },
  );
});
