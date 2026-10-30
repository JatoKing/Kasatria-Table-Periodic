import 'server-only';

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

/** Read-only access to Google Sheets, requested for the service account. The app never writes to the sheet. */
export const SHEETS_READONLY_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';

export class SheetsApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'SheetsApiError';
  }
}

interface ValuesResponse {
  range?: string;
  majorDimension?: string;
  values?: unknown[][];
}

interface GoogleApiErrorBody {
  error?: {
    message?: string;
    status?: string;
    details?: Array<{ reason?: string }>;
  };
}

export interface FetchSheetValuesParams {
  spreadsheetId: string;
  range: string;
  /** The service account's access token. */
  accessToken: string;
  signal?: AbortSignal;
}

/**
 * Reads a range with the service account's access token. The spreadsheet stays private:
 * it is shared with the service account as Viewer, not with the people who sign in.
 *
 * UNFORMATTED_VALUE returns numbers as numbers (251260.8 rather than "$251,260.80").
 */
export async function fetchSheetValues({
  spreadsheetId,
  range,
  accessToken,
  signal,
}: FetchSheetValuesParams): Promise<unknown[][]> {
  const url = new URL(
    `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`,
  );
  url.searchParams.set('valueRenderOption', 'UNFORMATTED_VALUE');
  url.searchParams.set('majorDimension', 'ROWS');

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
    signal,
  });

  if (!response.ok) {
    throw new SheetsApiError(await describeFailure(response, range), response.status);
  }

  const body = (await response.json()) as ValuesResponse;
  return body.values ?? [];
}

/**
 * Messages name the setting to fix. They reach signed-in users, so they never include the sheet ID
 * or the service account's address.
 */
async function describeFailure(response: Response, range: string): Promise<string> {
  let apiMessage = '';
  let reasons: string[] = [];
  try {
    const body = (await response.json()) as GoogleApiErrorBody;
    apiMessage = body.error?.message ?? '';
    reasons = (body.error?.details ?? []).map((detail) => detail.reason ?? '');
  } catch {
    // The body was not JSON. Fall back to the status code below.
  }

  switch (response.status) {
    case 401:
      return 'Google Sheets did not accept the service account. Check GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.';
    case 403:
      if (reasons.includes('SERVICE_DISABLED') || apiMessage.includes('has not been used')) {
        return 'The Google Sheets API is not enabled for this Google Cloud project.';
      }
      return 'The service account cannot open the spreadsheet. Share the sheet with the GOOGLE_SERVICE_ACCOUNT_EMAIL address as Viewer.';
    case 404:
      return 'The spreadsheet was not found. Check SPREADSHEET_ID, and that the sheet is shared with the GOOGLE_SERVICE_ACCOUNT_EMAIL address as Viewer.';
    case 400:
      return `The sheet range ${range} could not be read. Check the tab name in SHEET_RANGE.`;
    default:
      return apiMessage || `Google Sheets returned an error (HTTP ${response.status}).`;
  }
}
