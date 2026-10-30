import { ConfigError } from '@/config/app-config';
import { getServerConfig } from '@/config/server-config';
import { getServiceAccountToken, ServiceAccountError } from '@/lib/google/service-account';
import { fetchSheetValues, SHEETS_READONLY_SCOPE, SheetsApiError } from '@/lib/google/sheets-api';
import {
  InvalidTokenError,
  readBearerToken,
  verifyGoogleAccessToken,
} from '@/lib/google/token-verification';
import { parsePeopleRows, SheetFormatError } from '@/lib/people/parse-people';

/** Responses carry one user's data behind their sign-in, so nothing may cache them. */
const NO_STORE = { 'Cache-Control': 'private, no-store' };

/**
 * People from the private sheet, for any signed-in Google user:
 * 1. check that the caller's Google access token is valid and was issued to this app,
 * 2. read the sheet with the service account, the only account the sheet is shared with,
 * 3. parse the rows and return them as JSON.
 *
 * Reading the request headers makes this run on every request, even with Cache Components.
 */
export async function GET(request: Request): Promise<Response> {
  const userToken = readBearerToken(request.headers.get('authorization'));
  if (!userToken) return errorResponse(401, 'Sign in to load the people data.');

  try {
    const config = getServerConfig();
    const user = await verifyGoogleAccessToken(userToken, config.googleClientId, request.signal);
    const serviceToken = await getServiceAccountToken(
      { email: config.serviceAccountEmail, privateKey: config.serviceAccountPrivateKey },
      SHEETS_READONLY_SCOPE,
      request.signal,
    );
    const rows = await fetchSheetValues({
      spreadsheetId: config.spreadsheetId,
      range: config.sheetRange,
      accessToken: serviceToken,
      signal: request.signal,
    });
    const data = parsePeopleRows(rows);

    console.info(`[api/people] ${user.email ?? `user ${user.userId}`} loaded ${data.people.length} people`);
    return Response.json(data, { headers: NO_STORE });
  } catch (error) {
    // The browser gave up (sign-out, retry or a closed tab). Nobody is waiting for an answer.
    if (request.signal.aborted) return errorResponse(499, 'The request was cancelled.');
    return describeError(error);
  }
}

function describeError(error: unknown): Response {
  if (error instanceof InvalidTokenError) return errorResponse(401, error.message);

  if (error instanceof SheetFormatError) {
    console.error(`[api/people] ${error.message}`);
    return errorResponse(422, error.message);
  }
  if (error instanceof ConfigError || error instanceof ServiceAccountError) {
    console.error(`[api/people] ${error.message}`);
    return errorResponse(500, error.message);
  }
  if (error instanceof SheetsApiError) {
    console.error(`[api/people] Google Sheets HTTP ${error.status}: ${error.message}`);
    return errorResponse(502, error.message);
  }

  console.error('[api/people] Unexpected error', error);
  return errorResponse(500, 'The people data could not be loaded. Try again in a moment.');
}

function errorResponse(status: number, message: string): Response {
  return Response.json({ error: message }, { status, headers: NO_STORE });
}
