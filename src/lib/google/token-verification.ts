import 'server-only';

const TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';

/** The access token is missing, expired, revoked or was issued to another app. The user must sign in again. */
export class InvalidTokenError extends Error {
  constructor(message = 'Your Google session expired. Sign in again.') {
    super(message);
    this.name = 'InvalidTokenError';
  }
}

export interface VerifiedUser {
  userId: string;
  email: string | null;
}

interface TokenInfoResponse {
  aud?: string;
  azp?: string;
  sub?: string;
  email?: string;
  expires_in?: string | number;
}

/** Reads the token from an `Authorization: Bearer <token>` header. */
export function readBearerToken(header: string | null): string | null {
  const match = header?.match(/^Bearer\s+(\S+)\s*$/i);
  return match ? match[1] : null;
}

/**
 * Asks Google whether an access token is valid and was issued to this app's OAuth client.
 * The audience check matters: without it, a token the user granted to any other app would be accepted.
 *
 * Google answers 400 for expired or unknown tokens. Any other failure is Google's side, so it is
 * reported as an ordinary error rather than as a reason to sign the user out.
 */
export async function verifyGoogleAccessToken(
  token: string,
  clientId: string,
  signal?: AbortSignal,
): Promise<VerifiedUser> {
  const url = new URL(TOKENINFO_URL);
  url.searchParams.set('access_token', token);

  const response = await fetch(url, { cache: 'no-store', signal });
  if (response.status === 400 || response.status === 401) throw new InvalidTokenError();
  if (!response.ok) {
    throw new Error(`Google could not check the sign-in (HTTP ${response.status}).`);
  }

  const info = (await response.json()) as TokenInfoResponse;
  if (info.aud !== clientId && info.azp !== clientId) {
    throw new InvalidTokenError('This sign-in was not made for this app. Sign in again.');
  }
  if (!info.sub || !(Number(info.expires_in) > 0)) throw new InvalidTokenError();

  return { userId: info.sub, email: info.email ?? null };
}
