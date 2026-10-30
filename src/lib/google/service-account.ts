import 'server-only';
import { createSign } from 'node:crypto';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
/** Lifetime of the signed assertion. Google accepts at most one hour. */
const ASSERTION_LIFETIME_SECONDS = 3600;
/** A cached token is replaced this long before it expires, so it never runs out mid-request. */
const REFRESH_MARGIN_MS = 60_000;

export class ServiceAccountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ServiceAccountError';
  }
}

export interface ServiceAccountCredentials {
  email: string;
  /** PEM, with real line breaks. */
  privateKey: string;
}

interface CachedToken {
  key: string;
  accessToken: string;
  expiresAt: number;
}

/** One token per server instance, shared by every request until shortly before it expires. */
let cachedToken: CachedToken | null = null;

/**
 * Gets an access token for the service account with Google's JWT bearer flow: sign a short-lived
 * JWT (RS256) with the account's private key, then trade it at Google's token endpoint.
 * Uses node:crypto, so no Google client library is needed.
 */
export async function getServiceAccountToken(
  credentials: ServiceAccountCredentials,
  scope: string,
  signal?: AbortSignal,
): Promise<string> {
  const key = `${credentials.email} ${scope}`;
  if (cachedToken?.key === key && Date.now() < cachedToken.expiresAt - REFRESH_MARGIN_MS) {
    return cachedToken.accessToken;
  }

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: createAssertion(credentials, scope),
    }),
    cache: 'no-store',
    signal,
  });

  if (!response.ok) {
    throw new ServiceAccountError(
      `Google rejected the service account credentials (${await describeTokenError(response)}). ` +
        'Check GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.',
    );
  }

  const body = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!body.access_token) {
    throw new ServiceAccountError('Google returned no access token for the service account.');
  }

  cachedToken = {
    key,
    accessToken: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? ASSERTION_LIFETIME_SECONDS) * 1000,
  };
  return body.access_token;
}

/** Forgets the cached token. For tests. */
export function resetServiceAccountTokenCache(): void {
  cachedToken = null;
}

function createAssertion({ email, privateKey }: ServiceAccountCredentials, scope: string): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = toBase64Url({ alg: 'RS256', typ: 'JWT' });
  const claims = toBase64Url({
    iss: email,
    scope,
    aud: TOKEN_URL,
    iat: issuedAt,
    exp: issuedAt + ASSERTION_LIFETIME_SECONDS,
  });
  const unsigned = `${header}.${claims}`;

  let signature: string;
  try {
    signature = createSign('RSA-SHA256').update(unsigned).sign(privateKey, 'base64url');
  } catch {
    // The crypto error is not passed on: it says nothing useful and should never echo key material.
    throw new ServiceAccountError(
      'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is not a valid private key. Use the private_key value from ' +
        'the JSON key file, including the BEGIN and END lines.',
    );
  }
  return `${unsigned}.${signature}`;
}

function toBase64Url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

async function describeTokenError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string; error_description?: string };
    if (body.error) return body.error_description ? `${body.error}: ${body.error_description}` : body.error;
  } catch {
    // Not JSON. Fall back to the status code.
  }
  return `HTTP ${response.status}`;
}
