/**
 * Runtime configuration, read from NEXT_PUBLIC_* environment variables.
 *
 * Next.js inlines NEXT_PUBLIC_* values at build time, and only when they are written as a literal
 * `process.env.NEXT_PUBLIC_...` expression. That is why each variable is read explicitly below
 * instead of through a dynamic lookup. Changing a value on Vercel therefore needs a redeploy.
 */

/** Read-only access to Google Sheets. The app never needs to write to the sheet. */
export const SHEETS_READONLY_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';

/** Scopes requested in the single sign-in pop-up. Must match the scopes registered under Data Access. */
export const GOOGLE_SCOPES = ['openid', 'email', 'profile', SHEETS_READONLY_SCOPE] as const;

/** Used when NEXT_PUBLIC_SHEET_RANGE is not set. A1 notation; quote tab names that contain spaces. */
export const DEFAULT_SHEET_RANGE = "'Data Template'!A:F";

export interface AppConfig {
  googleClientId: string;
  spreadsheetId: string;
  sheetRange: string;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

function requireValue(name: string, value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new ConfigError(
      `${name} is not set. Copy .env.example to .env.local (or add it in Vercel) and restart the app.`,
    );
  }
  return trimmed;
}

export function getAppConfig(): AppConfig {
  return {
    googleClientId: requireValue(
      'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    ),
    spreadsheetId: requireValue('NEXT_PUBLIC_SPREADSHEET_ID', process.env.NEXT_PUBLIC_SPREADSHEET_ID),
    sheetRange: process.env.NEXT_PUBLIC_SHEET_RANGE?.trim() || DEFAULT_SHEET_RANGE,
  };
}
