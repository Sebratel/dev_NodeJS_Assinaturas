import { createContext } from 'react'

export interface SessionUser {
  email: string
  name: string
  photoUrl: string | null
}

export type AuthStatus = 'loading' | 'signed-out' | 'signed-in' | 'local'

/** Por onde a pessoa entrou: Hub Apps (quadro), Google na própria página, ou modo local sem login. */
export type AuthEntry = 'hub' | 'google' | 'local'

export interface AuthContextValue {
  status: AuthStatus
  user: SessionUser | null
  via: AuthEntry
  signInError: string | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

/** Valor fica em AuthProvider (AuthContext.tsx); leitura pelo hook useAuth. */
export const AuthContext = createContext<AuthContextValue | null>(null)
