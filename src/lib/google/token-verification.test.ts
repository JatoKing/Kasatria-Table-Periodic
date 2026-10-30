import { describe, expect, it, vi } from 'vitest';
import { InvalidTokenError, readBearerToken, verifyGoogleAccessToken } from './token-verification';

const CLIENT_ID = 'client-123.apps.googleusercontent.com';

function mockTokenInfo(response: Response) {
  const fetchMock = vi.fn<typeof fetch>(async () => response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('readBearerToken', () => {
  it.each([
    ['Bearer abc.def', 'abc.def'],
    ['bearer abc', 'abc'],
    ['Bearer', null],
    ['Basic abc', null],
    [null, null],
  ])('reads %j as %j', (header, expected) => {
    expect(readBearerToken(header)).toBe(expected);
  });
});

describe('verifyGoogleAccessToken', () => {
  it('returns the user for a valid token issued to this app', async () => {
    const fetchMock = mockTokenInfo(
      Response.json({ aud: CLIENT_ID, azp: CLIENT_ID, sub: '42', email: 'user@example.com', expires_in: '3599' }),
    );

    await expect(verifyGoogleAccessToken('user-token', CLIENT_ID)).resolves.toEqual({
      userId: '42',
      email: 'user@example.com',
    });
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.origin + url.pathname).toBe('https://oauth2.googleapis.com/tokeninfo');
    expect(url.searchParams.get('access_token')).toBe('user-token');
  });

  it('accepts a token whose authorised party is this app', async () => {
    mockTokenInfo(Response.json({ aud: 'other', azp: CLIENT_ID, sub: '42', expires_in: 100 }));
    await expect(verifyGoogleAccessToken('user-token', CLIENT_ID)).resolves.toEqual({ userId: '42', email: null });
  });

  it('rejects a token issued to another app', async () => {
    mockTokenInfo(Response.json({ aud: 'other-app', azp: 'other-app', sub: '42', expires_in: '3599' }));
    await expect(verifyGoogleAccessToken('user-token', CLIENT_ID)).rejects.toThrow(InvalidTokenError);
  });

  it('rejects an expired token (Google answers 400)', async () => {
    mockTokenInfo(Response.json({ error: 'invalid_token' }, { status: 400 }));
    await expect(verifyGoogleAccessToken('user-token', CLIENT_ID)).rejects.toThrow(InvalidTokenError);
  });

  it('rejects a token with no time left', async () => {
    mockTokenInfo(Response.json({ aud: CLIENT_ID, sub: '42', expires_in: '0' }));
    await expect(verifyGoogleAccessToken('user-token', CLIENT_ID)).rejects.toThrow(InvalidTokenError);
  });

  it('does not treat a Google outage as a sign-out', async () => {
    mockTokenInfo(new Response('Service unavailable', { status: 503 }));
    const result = verifyGoogleAccessToken('user-token', CLIENT_ID);
    await expect(result).rejects.toThrow(/HTTP 503/);
    await expect(result).rejects.not.toBeInstanceOf(InvalidTokenError);
  });
});
