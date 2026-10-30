import { createVerify, generateKeyPairSync } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getServiceAccountToken, resetServiceAccountTokenCache, ServiceAccountError } from './service-account';

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

const CREDENTIALS = { email: 'reader@project.iam.gserviceaccount.com', privateKey };
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';

function mockTokenEndpoint(...responses: Response[]) {
  const fetchMock = vi.fn<typeof fetch>(async () => {
    const next = responses.shift();
    if (!next) throw new Error('Unexpected extra token request');
    return next;
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function decodeSegment(segment: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8')) as Record<string, unknown>;
}

beforeEach(() => {
  resetServiceAccountTokenCache();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('getServiceAccountToken', () => {
  it('trades a signed JWT for an access token', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-30T00:00:00Z'));
    const fetchMock = mockTokenEndpoint(Response.json({ access_token: 'sa-token', expires_in: 3599 }));

    await expect(getServiceAccountToken(CREDENTIALS, SCOPE)).resolves.toBe('sa-token');

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://oauth2.googleapis.com/token');
    expect(init?.method).toBe('POST');
    const body = new URLSearchParams(String(init?.body));
    expect(body.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer');

    const [header, claims, signature] = (body.get('assertion') ?? '').split('.');
    expect(decodeSegment(header)).toEqual({ alg: 'RS256', typ: 'JWT' });
    const issuedAt = Math.floor(Date.parse('2026-10-30T00:00:00Z') / 1000);
    expect(decodeSegment(claims)).toEqual({
      iss: CREDENTIALS.email,
      scope: SCOPE,
      aud: 'https://oauth2.googleapis.com/token',
      iat: issuedAt,
      exp: issuedAt + 3600,
    });
    const verifier = createVerify('RSA-SHA256').update(`${header}.${claims}`);
    expect(verifier.verify(publicKey, signature, 'base64url')).toBe(true);
  });

  it('reuses the token until a minute before it expires, then gets a new one', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-30T00:00:00Z'));
    const fetchMock = mockTokenEndpoint(
      Response.json({ access_token: 'first', expires_in: 3600 }),
      Response.json({ access_token: 'second', expires_in: 3600 }),
    );

    await expect(getServiceAccountToken(CREDENTIALS, SCOPE)).resolves.toBe('first');
    vi.setSystemTime(new Date('2026-10-30T00:58:00Z'));
    await expect(getServiceAccountToken(CREDENTIALS, SCOPE)).resolves.toBe('first');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date('2026-10-30T00:59:01Z'));
    await expect(getServiceAccountToken(CREDENTIALS, SCOPE)).resolves.toBe('second');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('reports credentials that Google rejects', async () => {
    mockTokenEndpoint(
      Response.json({ error: 'invalid_grant', error_description: 'Invalid JWT Signature.' }, { status: 400 }),
    );

    const result = getServiceAccountToken(CREDENTIALS, SCOPE);
    await expect(result).rejects.toThrow(ServiceAccountError);
    await expect(result).rejects.toThrow(/invalid_grant: Invalid JWT Signature\..*GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY/);
  });

  it('reports a private key that cannot sign, without calling Google', async () => {
    const fetchMock = mockTokenEndpoint();
    await expect(getServiceAccountToken({ ...CREDENTIALS, privateKey: 'not a key' }, SCOPE)).rejects.toThrow(
      /GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is not a valid private key/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
