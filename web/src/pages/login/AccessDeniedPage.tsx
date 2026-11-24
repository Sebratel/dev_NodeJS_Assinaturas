import { useQueryClient } from '@tanstack/react-query'
import { ShieldX } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useAuthConfig } from '../../hooks/useAuthConfig'
import { HubLink } from './HubLink'
import {
  LoginCardHeader,
  LoginHelp,
  LoginNotice,
  LoginShell,
} from './LoginShell'

/**
 * A API conferiu o login e recusou, na mesma moldura do login:
 * - 403 AUTH_FORBIDDEN: conta fora do domínio ou e-mail não verificado;
 * - 403 HUB_ONLY: login direto fechado (só os masters da stack, AUTH_ADMIN_EMAILS, entram
 *   sem o Hub); o caminho é o Hub Apps.
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
    <LoginShell>
      <LoginCardHeader
        title={hubOnly ? 'Acesse pelo Hub Apps' : 'Sem acesso'}
        text={message}
      />

      <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-700">
        <ShieldX className="h-4 w-4 shrink-0 text-rose-600" aria-hidden />
        <span className="truncate">{user?.email}</span>
      </div>

      {hubOnly && (
        <LoginNotice>
          <p className="text-xs leading-relaxed text-neutral-700">
            As Assinaturas abrem dentro do Hub Apps. Entre no Hub e clique em
            Gestor de Assinaturas.
          </p>
          <HubLink href={hubUrl} />
        </LoginNotice>
      )}

      <button
        type="button"
        onClick={() => {
          void signOut().then(() => queryClient.clear())
        }}
        className="flex min-h-[36px] w-full items-center justify-center rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-[#252423] transition hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
      >
        Sair e usar outra conta
      </button>

      <LoginHelp />
    </LoginShell>
  )
}
