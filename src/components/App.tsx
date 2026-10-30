'use client';

import { AuthProvider, useAuth } from '@/components/auth/AuthProvider';
import { LoginScreen } from '@/components/auth/LoginScreen';
import { PeopleExplorer } from '@/components/people/PeopleExplorer';

function AuthGate() {
  const { state, signIn, signOut } = useAuth();

  if (state.status === 'signed-in') {
    return <PeopleExplorer session={state.session} onSignOut={signOut} />;
  }

  return <LoginScreen state={state} onSignIn={signIn} />;
}

export function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
