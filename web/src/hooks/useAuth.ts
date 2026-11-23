import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from '../context/auth-context'

/** Sessão atual: status, usuário, entrar e sair. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context)
    throw new Error('useAuth precisa estar dentro de <AuthProvider>.')
  return context
}
