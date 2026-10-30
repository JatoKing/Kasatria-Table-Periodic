/**
 * Thin wrapper around Google Identity Services (GIS) for the OAuth 2.0 token flow.
 *
 * One pop-up both identifies the user and grants an access token for the Sheets API,
 * so the sign-in in this app is also what unlocks the data.
 */

const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

type TokenResponse = google.accounts.oauth2.TokenResponse;

export type AuthErrorCode =
  | 'popup_closed'
  | 'popup_failed_to_open'
  | 'access_denied'
  | 'scope_not_granted'
  | 'superseded'
  | 'unknown';

export class AuthError extends Error {
  constructor(
    readonly code: AuthErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'AuthError';
  }
}

/** `null` means the outcome needs no message, e.g. the user closed the pop-up on purpose. */
const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string | null> = {
  popup_closed: null,
  superseded: null,
  popup_failed_to_open:
    'The Google sign-in window was blocked. Allow pop-ups for this site, then sign in again.',
  access_denied: 'Access was not granted. Sign in again and allow access to continue.',
  scope_not_granted:
    'The people data is read from a Google Sheet. Sign in again and tick “See all your Google Sheets spreadsheets”.',
  unknown: 'Sign-in failed. Try again.',
};

export function describeAuthError(error: unknown): string | null {
  if (error instanceof AuthError) {
    if (error.code === 'unknown' && error.message && error.message !== 'unknown') {
      return error.message;
    }
    return AUTH_ERROR_MESSAGES[error.code];
  }
  if (error instanceof Error && error.message) return error.message;
  return AUTH_ERROR_MESSAGES.unknown;
}

function isLoaded(): boolean {
  return typeof google !== 'undefined' && Boolean(google.accounts?.oauth2);
}

let scriptPromise: Promise<void> | null = null;

/** Loads the GIS script once. Safe to call many times (and under React Strict Mode). */
export function loadGoogleIdentityServices(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google sign-in can only load in the browser.'));
  }
  if (isLoaded()) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      script.remove();
      reject(new Error('Google sign-in could not load. Check your connection and reload the page.'));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

interface PendingRequest {
  resolve: (response: TokenResponse) => void;
  reject: (error: AuthError) => void;
}

/** Promise-based token client. GIS itself only offers callbacks. */
export class GoogleTokenClient {
  private readonly client: google.accounts.oauth2.TokenClient;
  private pending: PendingRequest | null = null;

  constructor(clientId: string, scopes: readonly string[]) {
    this.client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: scopes.join(' '),
      callback: (response) => this.handleResponse(response),
      error_callback: (error) => this.reject(new AuthError(error.type, error.message)),
    });
  }

  /**
   * Opens the Google pop-up. Call it directly inside a click handler:
   * browsers only allow pop-ups that come straight from a user gesture.
   */
  requestAccessToken(): Promise<TokenResponse> {
    this.reject(new AuthError('superseded'));
    return new Promise<TokenResponse>((resolve, reject) => {
      this.pending = { resolve, reject };
      this.client.requestAccessToken();
    });
  }

  private handleResponse(response: TokenResponse): void {
    if (response.error) {
      const code: AuthErrorCode = response.error === 'access_denied' ? 'access_denied' : 'unknown';
      this.reject(new AuthError(code, response.error_description || response.error));
      return;
    }
    const pending = this.pending;
    this.pending = null;
    pending?.resolve(response);
  }

  private reject(error: AuthError): void {
    const pending = this.pending;
    this.pending = null;
    pending?.reject(error);
  }
}

/** With granular consent, a user can untick individual scopes, so check before using the token. */
export function hasGrantedScopes(
  response: TokenResponse,
  [firstScope, ...otherScopes]: readonly [string, ...string[]],
): boolean {
  return google.accounts.oauth2.hasGrantedAllScopes(response, firstScope, ...otherScopes);
}

/** Revokes the grant so the token can no longer be used. Errors are ignored: the session ends either way. */
export function revokeAccessToken(accessToken: string): void {
  if (!isLoaded()) return;
  google.accounts.oauth2.revoke(accessToken, () => undefined);
}
