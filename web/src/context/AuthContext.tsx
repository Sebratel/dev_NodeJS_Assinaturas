import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { config } from '../config'
import { setSessionExpiredHandler } from '../services/api-client'
import {
  describeSignInError,
  firebaseAuthService,
} from '../services/firebase-auth.service'
import { hubSession } from '../services/hub-session'
import {
  AuthContext,
  type AuthContextValue,
  type AuthStatus,
  type SessionUser,
} from './auth-context'

const LOCAL_USER: SessionUser = {
  email: 'local',
  name: 'Modo local',
  photoUrl: null,
}

function hubUser(): SessionUser | null {
  const session = config.auth.enabled ? hubSession.get() : null
  return session
    ? { email: session.user.email, name: session.user.name, photoUrl: null }
    : null
}

/**
 * Sessão do usuário. Duas entradas: pelo Hub Apps (sessão trocada em main.tsx, só neste quadro) ou login com
 * Google na própria página (Firebase). A do Hub tem prioridade. Com login desligado (desenvolvimento local),
 * entra direto como "Modo local".
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [hub, setHub] = useState<SessionUser | null>(hubUser)
  const [firebaseStatus, setFirebaseStatus] = useState<AuthStatus>(
    config.auth.enabled ? 'loading' : 'local'
  )
  const [firebaseUser, setFirebaseUser] = useState<SessionUser | null>(
    config.auth.enabled ? null : LOCAL_USER
  )
  // Motivo de uma entrada pelo Hub recusada (token vencido, usado, sem acesso...): aparece na tela de login.
  const [signInError, setSignInError] = useState<string | null>(() =>
    hubSession.takeError()
  )

  useEffect(() => {
    if (!config.auth.enabled) return
    // 401 que persiste depois de renovar o token: a sessão acabou de verdade (padrao-login-sso).
    setSessionExpiredHandler(() => {
      if (hubSession.get() === null && hub) {
        setHub(null)
        setSignInError(hubSession.takeError())
        return
      }
      void firebaseAuthService.signOut()
    })
  }, [hub])

  useEffect(() => {
    if (!config.auth.enabled) return
    return firebaseAuthService.onUserChanged((user) => {
      setFirebaseUser(
        user
          ? {
              email: user.email ?? '',
              name: user.displayName ?? user.email ?? '',
              photoUrl: user.photoURL,
            }
          : null
      )
      setFirebaseStatus(user ? 'signed-in' : 'signed-out')
    })
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      status: hub ? 'signed-in' : firebaseStatus,
      user: hub ?? firebaseUser,
      via: !config.auth.enabled ? 'local' : hub ? 'hub' : 'google',
      signInError,
      signIn: async () => {
        setSignInError(null)
        try {
          await firebaseAuthService.signIn()
        } catch (error) {
          setSignInError(describeSignInError(error))
        }
      },
      signOut: async () => {
        hubSession.clear()
        setHub(null)
        if (config.auth.enabled) await firebaseAuthService.signOut()
      },
    }),
    [hub, firebaseStatus, firebaseUser, signInError]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
