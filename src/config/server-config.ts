import 'server-only';
import { cleanEnvValue, DEFAULT_SHEET_RANGE, requireEnvValue } from './app-config';

/**
 * Configuration for /api/people. Apart from the OAuth client ID, none of these use the NEXT_PUBLIC_
 * prefix, so Next.js never puts them in the browser bundle, and `server-only` makes importing this
 * file from client code a build error.
 */
export interface ServerConfig {
  /** Access tokens must have been issued to this client, or they are rejected. */
  googleClientId: string;
  spreadsheetId: string;
  sheetRange: string;
  serviceAccountEmail: string;
  serviceAccountPrivateKey: string;
}

/**
 * Vercel and copied JSON usually hold the key on one line with literal "\n" sequences.
 * The PEM parser needs real line breaks.
 */
export function normalizePrivateKey(value: string): string {
  return value.replace(/\\n/g, '\n');
}

export function getServerConfig(): ServerConfig {
  return {
    googleClientId: requireEnvValue(
      'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    ),
    spreadsheetId: requireEnvValue('SPREADSHEET_ID', process.env.SPREADSHEET_ID),
    sheetRange: cleanEnvValue(process.env.SHEET_RANGE) || DEFAULT_SHEET_RANGE,
    serviceAccountEmail: requireEnvValue(
      'GOOGLE_SERVICE_ACCOUNT_EMAIL',
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    ),
    serviceAccountPrivateKey: normalizePrivateKey(
      requireEnvValue('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY', process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY),
    ),
  };
}
