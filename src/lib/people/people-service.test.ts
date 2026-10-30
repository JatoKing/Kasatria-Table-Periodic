import { describe, expect, it, vi } from 'vitest';
import { loadPeople, PeopleApiError } from './people-service';

describe('loadPeople', () => {
  it('calls /api/people with the access token as a bearer token', async () => {
    const data = { people: [], skippedRows: [] };
    const fetchMock = vi.fn<typeof fetch>(async () => Response.json(data));
    vi.stubGlobal('fetch', fetchMock);

    await expect(loadPeople('user-token')).resolves.toEqual(data);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/people');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer user-token');
    expect(init?.cache).toBe('no-store');
  });

  it("throws the server's message with the HTTP status", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ error: 'Your Google session expired. Sign in again.' }, { status: 401 })),
    );

    const error = await loadPeople('user-token').catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(PeopleApiError);
    expect(error).toMatchObject({ message: 'Your Google session expired. Sign in again.', status: 401 });
  });

  it('falls back to the status when the body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Bad gateway', { status: 502 })));
    await expect(loadPeople('user-token')).rejects.toMatchObject({ status: 502, message: expect.stringContaining('HTTP 502') });
  });
});
