/**
 * Browser-safe configuration. Only NEXT_PUBLIC_* values belong here: Next.js inlines them into the
 * client bundle at build time, and only when they are written as a literal `process.env.NEXT_PUBLIC_...`
 * expression, which is why each variable is read explicitly. Changing a value on Vercel needs a redeploy.
 *
 * Server-only values (sheet ID, service account) live in server-config.ts.
 */

/**
 * Scopes requested in the sign-in pop-up. All three are non-sensitive, so the OAuth app can be
 * published without Google verification. The sheet is read by the server, not with this token.
 */
export const GOOGLE_SCOPES = ['openid', 'email', 'profile'] as const;

/** Used when SHEET_RANGE is not set. A1 notation; quote tab names that contain spaces. */
export const DEFAULT_SHEET_RANGE = "'Data Template'!A:F";

export interface AppConfig {
  googleClientId: string;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

/**
 * Trims a value and strips one pair of wrapping quotes ("x" or 'x'), which .env files and copied
 * dashboard values often keep. A range like 'Data Template'!A:F is not wrapped, so it stays as it is.
 */
export function cleanEnvValue(value: string | undefined): string {
  const trimmed = value?.trim() ?? '';
  const first = trimmed.charAt(0);
  const isWrapped = trimmed.length >= 2 && (first === '"' || first === "'") && trimmed.endsWith(first);
  return isWrapped ? trimmed.slice(1, -1) : trimmed;
}

export function requireEnvValue(name: string, value: string | undefined): string {
  const cleaned = cleanEnvValue(value);
  if (!cleaned) {
    throw new ConfigError(
      `${name} is not set. Add it to .env.local (or to the Vercel project), then restart or redeploy.`,
    );
  }
  return cleaned;
}

export function getAppConfig(): AppConfig {
  return {
    googleClientId: requireEnvValue(
      'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    ),
  };
}
