'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { getAppConfig, GOOGLE_SCOPES, SHEETS_READONLY_SCOPE } from '@/config/app-config';
import {
  AuthError,
  describeAuthError,
  GoogleTokenClient,
  hasGrantedScopes,
  loadGoogleIdentityServices,
  revokeAccessToken,
} from '@/lib/google/identity-services';
import { fetchGoogleUser, type GoogleUser } from '@/lib/google/user-profile';

export interface Session {
  user: GoogleUser;
  accessToken: string;
  /** Epoch milliseconds. */
  expiresAt: number;
}

export type AuthState =
  | { status: 'initializing' }
  /** Sign-in cannot work: configuration is missing or the Google script failed to load. */
  | { status: 'unavailable'; message: string }
  | { status: 'signed-out'; message: string | null }
  | { status: 'signing-in' }
  | { status: 'signed-in'; session: Session };

interface AuthContextValue {
  state: AuthState;
  signIn: () => void;
  signOut: (message?: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function createTokenClient(): Promise<GoogleTokenClient> {
  const { googleClientId } = getAppConfig();
  await loadGoogleIdentityServices();
  return new GoogleTokenClient(googleClientId, GOOGLE_SCOPES);
}

/**
 * Holds the session in memory only. The access token never touches localStorage, so a page reload
 * signs the user out. That trade-off keeps the token out of reach of persisted-storage attacks.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'initializing' });
  const clientRef = useRef<GoogleTokenClient | null>(null);
  const accessTokenRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    createTokenClient()
      .then((client) => {
        if (!active) return;
        clientRef.current = client;
        setState({ status: 'signed-out', message: null });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          status: 'unavailable',
          message: describeAuthError(error) ?? 'Google sign-in is unavailable.',
        });
      });

    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(() => {
    const client = clientRef.current;
    if (!client) return;

    setState({ status: 'signing-in' });

    // requestAccessToken() opens the pop-up synchronously, inside this click handler.
    client
      .requestAccessToken()
      .then(async (token) => {
        if (!hasGrantedScopes(token, [SHEETS_READONLY_SCOPE])) {
          revokeAccessToken(token.access_token);
          throw new AuthError('scope_not_granted');
        }

        const user = await fetchGoogleUser(token.access_token);
        accessTokenRef.current = token.access_token;
        setState({
          status: 'signed-in',
          session: {
            user,
            accessToken: token.access_token,
            expiresAt: Date.now() + Number(token.expires_in) * 1000,
          },
        });
      })
      .catch((error: unknown) => {
        if (error instanceof AuthError && error.code === 'superseded') return;
        setState({ status: 'signed-out', message: describeAuthError(error) });
      });
  }, []);

  const signOut = useCallback((message?: string) => {
    if (accessTokenRef.current) revokeAccessToken(accessTokenRef.current);
    accessTokenRef.current = null;
    setState({ status: 'signed-out', message: message ?? null });
  }, []);

  const value = useMemo(() => ({ state, signIn, signOut }), [state, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.');
  return context;
}
