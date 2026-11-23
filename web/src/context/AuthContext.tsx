import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { config } from '../config';
import { setSessionExpiredHandler } from '../services/api-client';
import { describeSignInError, firebaseAuthService } from '../services/firebase-auth.service';
import { AuthContext, type AuthContextValue, type AuthStatus, type SessionUser } from './auth-context';

const LOCAL_USER: SessionUser = { email: 'local', name: 'Modo local', photoUrl: null };

/** Sessão do usuário. Com login desligado (desenvolvimento local), entra direto como "Modo local". */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(config.auth.enabled ? 'loading' : 'local');
  const [user, setUser] = useState<SessionUser | null>(config.auth.enabled ? null : LOCAL_USER);
  const [signInError, setSignInError] = useState<string | null>(null);

  useEffect(() => {
    if (!config.auth.enabled) return;
    // 401 que persiste depois de renovar o token: a sessão acabou de verdade (padrao-login-sso).
    setSessionExpiredHandler(() => void firebaseAuthService.signOut());
    return firebaseAuthService.onUserChanged((firebaseUser) => {
      setUser(
        firebaseUser
          ? { email: firebaseUser.email ?? '', name: firebaseUser.displayName ?? firebaseUser.email ?? '', photoUrl: firebaseUser.photoURL }
          : null,
      );
      setStatus(firebaseUser ? 'signed-in' : 'signed-out');
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      signInError,
      signIn: async () => {
        setSignInError(null);
        try {
          await firebaseAuthService.signIn();
        } catch (error) {
          setSignInError(describeSignInError(error));
        }
      },
      signOut: async () => {
        if (config.auth.enabled) await firebaseAuthService.signOut();
      },
    }),
    [status, user, signInError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
