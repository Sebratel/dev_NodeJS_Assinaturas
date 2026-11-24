import { useQueryClient } from '@tanstack/react-query'
import { ShieldX } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { useAuthConfig } from '../../hooks/useAuthConfig'
import { AuthCard } from './AuthCard'
import { HubLink } from './HubLink'

/**
 * A API conferiu o login e recusou:
 * - 403 AUTH_FORBIDDEN: conta fora do domínio ou sem cadastro na tela Usuários;
 * - 403 HUB_ONLY: tem acesso, mas o login direto está fechado (só master); o caminho é o Hub Apps.
 */
export function AccessDeniedPage({
  message,
  hubOnly = false,
}: {
  message: string
  hubOnly?: boolean
}) {
  const { user, signOut } = useAuth()
  const { hubUrl } = useAuthConfig()
  const queryClient = useQueryClient()

  return (
    <AuthCard
      title={hubOnly ? 'Acesse pelo Hub Apps' : 'Sem acesso'}
      subtitle={message}
    >
      <div className="flex items-center justify-center gap-2 rounded-xl bg-surface-container-low px-3 py-2.5 text-sm text-on-surface-variant">
        <ShieldX
          className="size-4 shrink-0 text-rose-600 dark:text-rose-400"
          aria-hidden
        />
        <span className="truncate">{user?.email}</span>
      </div>
      {hubOnly && <HubLink href={hubUrl} />}
      <Button
        variant="secondary"
        className="w-full"
        onClick={() => {
          void signOut().then(() => queryClient.clear())
        }}
      >
        Sair e usar outra conta
      </Button>
    </AuthCard>
  )
}
