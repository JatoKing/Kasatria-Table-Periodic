const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

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
  accessToken: string;
  signal?: AbortSignal;
}

/**
 * Reads a range with the signed-in user's access token. The spreadsheet stays private:
 * the request only succeeds for accounts the sheet is shared with.
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
    signal,
  });

  if (!response.ok) {
    throw new SheetsApiError(await describeFailure(response, range), response.status);
  }

  const body = (await response.json()) as ValuesResponse;
  return body.values ?? [];
}

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
      return 'Your Google session expired. Sign in again.';
    case 403:
      if (reasons.includes('SERVICE_DISABLED') || apiMessage.includes('has not been used')) {
        return 'The Google Sheets API is not enabled for this Google Cloud project.';
      }
      return 'This Google account cannot open the spreadsheet. Ask the owner to share it with you.';
    case 404:
      return 'The spreadsheet was not found. Check NEXT_PUBLIC_SPREADSHEET_ID.';
    case 400:
      return `The sheet range ${range} could not be read. Check the tab name in NEXT_PUBLIC_SHEET_RANGE.`;
    default:
      return apiMessage || `Google Sheets returned an error (HTTP ${response.status}).`;
  }
}
