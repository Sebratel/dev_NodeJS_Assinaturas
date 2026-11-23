import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { AccessDeniedPage } from '../../pages/login/AccessDeniedPage'
import { LoginPage } from '../../pages/login/LoginPage'
import { ApiError } from '../../services/api-client'
import { meService } from '../../services/me.service'
import { queryKeys } from '../../services/query-keys'
import { Spinner } from '../ui/Spinner'

function FullScreenLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="grid min-h-dvh place-items-center bg-surface text-on-surface-variant"
    >
      <div className="flex items-center gap-2 text-sm">
        <Spinner />
        Abrindo…
      </div>
    </div>
  )
}

/** Só deixa entrar quem tem sessão e a API aceitou. Com o login desligado, passa direto. */
export function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const signedIn = status === 'signed-in' || status === 'local'
  const me = useQuery({
    queryKey: queryKeys.me,
    queryFn: meService.get,
    enabled: signedIn,
    staleTime: 5 * 60_000,
    retry: false,
  })

  if (status === 'loading') return <FullScreenLoading />
  if (status === 'signed-out') return <LoginPage />
  if (me.isLoading) return <FullScreenLoading />
  if (me.error instanceof ApiError && me.error.code === 'AUTH_FORBIDDEN')
    return <AccessDeniedPage message={me.error.message} />
  return <>{children}</>
}
