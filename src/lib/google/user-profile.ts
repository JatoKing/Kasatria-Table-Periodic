const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

export interface GoogleUser {
  id: string;
  name: string;
  email: string;
  pictureUrl: string | null;
}

interface UserInfoResponse {
  sub: string;
  name?: string;
  email?: string;
  picture?: string;
}

/** Reads the signed-in user's basic profile (granted by the openid, email and profile scopes). */
export async function fetchGoogleUser(accessToken: string, signal?: AbortSignal): Promise<GoogleUser> {
  const response = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Your Google profile could not be read (HTTP ${response.status}). Sign in again.`);
  }

  const data = (await response.json()) as UserInfoResponse;
  return {
    id: data.sub,
    name: data.name ?? data.email ?? 'Google user',
    email: data.email ?? '',
    pictureUrl: data.picture ?? null,
  };
}
