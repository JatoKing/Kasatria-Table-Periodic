import type { PeopleData } from './types';

/** /api/people refused or failed. `status` is the HTTP status, e.g. 401 when the sign-in is no longer valid. */
export class PeopleApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'PeopleApiError';
  }
}

/**
 * Loads the people from this app's server, which checks the Google sign-in and reads the private
 * sheet with its service account. The browser never talks to the Sheets API.
 */
export async function loadPeople(accessToken: string, signal?: AbortSignal): Promise<PeopleData> {
  const response = await fetch('/api/people', {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
    signal,
  });

  if (!response.ok) {
    throw new PeopleApiError(await readErrorMessage(response), response.status);
  }
  return (await response.json()) as PeopleData;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === 'string' && body.error) return body.error;
  } catch {
    // Not JSON, e.g. a platform error page. Fall back to the status code.
  }
  return `The people data could not be loaded (HTTP ${response.status}).`;
}
