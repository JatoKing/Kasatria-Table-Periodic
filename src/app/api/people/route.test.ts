import { generateKeyPairSync } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetServiceAccountTokenCache } from '@/lib/google/service-account';
import { GET } from './route';

const CLIENT_ID = 'client-123.apps.googleusercontent.com';

const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

const SHEET_ROWS = [
  ['Name', 'Photo', 'Age', 'Country', 'Interest', ' Net Worth '],
  ['Ada Lovelace', 'https://example.com/ada.jpg', 36, 'UK', 'Maths', 251260.8],
  ['Alan Turing', '', 41, 'UK', 'Computing', 60393.6],
];

interface GoogleMock {
  tokenInfo?: () => Response;
  sheets?: () => Response;
}

/** Answers the three Google endpoints the route calls, and records which ones were hit. */
function mockGoogle({ tokenInfo, sheets }: GoogleMock = {}) {
  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    const url = String(input);
    if (url.startsWith('https://oauth2.googleapis.com/tokeninfo')) {
      return tokenInfo?.() ?? Response.json({ aud: CLIENT_ID, sub: '42', email: 'user@example.com', expires_in: '3599' });
    }
    if (url === 'https://oauth2.googleapis.com/token') {
      return Response.json({ access_token: 'service-token', expires_in: 3599 });
    }
    if (url.startsWith('https://sheets.googleapis.com/')) {
      return sheets?.() ?? Response.json({ values: SHEET_ROWS });
    }
    throw new Error(`Unexpected request to ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function calledUrls(fetchMock: ReturnType<typeof mockGoogle>): string[] {
  return fetchMock.mock.calls.map(([input]) => String(input));
}

function request(authorization?: string): Request {
  return new Request('http://localhost/api/people', {
    headers: authorization ? { Authorization: authorization } : {},
  });
}

beforeEach(() => {
  resetServiceAccountTokenCache();
  vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', CLIENT_ID);
  vi.stubEnv('SPREADSHEET_ID', 'sheet-123');
  vi.stubEnv('SHEET_RANGE', '');
  vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL', 'reader@project.iam.gserviceaccount.com');
  vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY', privateKey.replace(/\n/g, '\\n'));
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('GET /api/people', () => {
  it('returns the people and logs who loaded them', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const fetchMock = mockGoogle();

    const response = await GET(request('Bearer user-token'));

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    const body = (await response.json()) as { people: Array<{ name: string }>; skippedRows: number[] };
    expect(body.people.map((person) => person.name)).toEqual(['Ada Lovelace', 'Alan Turing']);
    expect(info).toHaveBeenCalledWith('[api/people] user@example.com loaded 2 people');

    const sheetsCall = fetchMock.mock.calls.find(([input]) => String(input).startsWith('https://sheets.googleapis.com/'));
    expect(new Headers(sheetsCall?.[1]?.headers).get('Authorization')).toBe('Bearer service-token');
    expect(String(sheetsCall?.[0])).toContain('/sheet-123/values/');
  });

  it('answers 401 without a bearer token', async () => {
    const fetchMock = mockGoogle();
    const response = await GET(request());
    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('answers 401 for an invalid token without reading the sheet', async () => {
    const fetchMock = mockGoogle({ tokenInfo: () => Response.json({ error: 'invalid_token' }, { status: 400 }) });

    const response = await GET(request('Bearer expired-token'));

    expect(response.status).toBe(401);
    expect(calledUrls(fetchMock).some((url) => url.startsWith('https://sheets.googleapis.com/'))).toBe(false);
    expect(calledUrls(fetchMock)).not.toContain('https://oauth2.googleapis.com/token');
  });

  it('answers 502 when the sheet is not shared with the service account', async () => {
    mockGoogle({
      sheets: () =>
        Response.json(
          { error: { message: 'The caller does not have permission', status: 'PERMISSION_DENIED' } },
          { status: 403 },
        ),
    });

    const response = await GET(request('Bearer user-token'));

    expect(response.status).toBe(502);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/GOOGLE_SERVICE_ACCOUNT_EMAIL.*Viewer/);
    expect(body.error).not.toContain('reader@project.iam.gserviceaccount.com');
  });

  it('answers 500 and names a missing environment variable', async () => {
    vi.stubEnv('SPREADSHEET_ID', '');
    mockGoogle();

    const response = await GET(request('Bearer user-token'));

    expect(response.status).toBe(500);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/SPREADSHEET_ID/);
  });
});
