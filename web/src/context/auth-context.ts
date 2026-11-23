import { createContext } from 'react'

export interface SessionUser {
  email: string
  name: string
  photoUrl: string | null
}

export type AuthStatus = 'loading' | 'signed-out' | 'signed-in' | 'local'

export interface AuthContextValue {
  status: AuthStatus
  user: SessionUser | null
  signInError: string | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

/** Valor fica em AuthProvider (AuthContext.tsx); leitura pelo hook useAuth. */
export const AuthContext = createContext<AuthContextValue | null>(null)
