import { getAppConfig } from '@/config/app-config';
import { fetchSheetValues } from '@/lib/google/sheets-api';
import { parsePeopleRows } from './parse-people';
import type { PeopleData } from './types';

/** Reads the configured sheet with the user's token and returns parsed people. */
export async function loadPeople(accessToken: string, signal?: AbortSignal): Promise<PeopleData> {
  const { spreadsheetId, sheetRange } = getAppConfig();
  const rows = await fetchSheetValues({ spreadsheetId, range: sheetRange, accessToken, signal });
  return parsePeopleRows(rows);
}
