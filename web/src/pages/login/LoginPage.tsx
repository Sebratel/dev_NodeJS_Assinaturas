import { AlertCircle, Loader2, Shield } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useAuthConfig } from '../../hooks/useAuthConfig'
import { cn } from '../../utils/cn'
import { HubLink } from './HubLink'
import {
  LoginCardHeader,
  LoginHelp,
  LoginNotice,
  LoginShell,
} from './LoginShell'

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.25 1.3-1 2.4-2.1 3.1l3.4 2.6c2-1.8 3.1-4.5 3.1-7.7 0-.75-.07-1.5-.2-2.2H12z"
      />
      <path
        fill="#34A853"
        d="M5.8 14.1l-.9.7-2.5 1.9C4.2 20.8 7.9 23 12 23c3 0 5.5-1 7.3-2.7l-3.4-2.6c-.9.6-2.1 1-3.9 1-3 0-5.5-2-6.4-4.7z"
      />
      <path
        fill="#FBBC05"
        d="M5.5 9.3 2.9 7.1C1.1 10.4 1.1 14.3 2.9 17.6l2.6-2c-.4-1.2-.4-2.5 0-3.7z"
      />
      <path
        fill="#4285F4"
        d="M12 5.8c1.7 0 3.2.6 4.4 1.8l3.3-3.3C16.5 2.1 14.4 1 12 1 7.9 1 4.2 3.2 2.9 7.1l2.6 2C6.5 7.4 9.1 5.8 12 5.8z"
      />
    </svg>
  )
}

/** Dentro do quadro do Hub Apps (window.top é outra página). */
function isFramed(): boolean {
  try {
    return window.self !== window.top
  } catch {
    return true
  }
}

/**
 * Login no padrão visual "Operação Sebratel" (o mesmo do Data Hub). Autenticação: Firebase (padrao-login-sso).
 * Com HUB_ONLY, uma entrada pelo Hub recusada, ou dentro do quadro do Hub, a chamada principal é o Hub Apps e o
 * Google fica discreto: é a porta do master se o Hub cair.
 */
export function LoginPage() {
  const { signIn, signInError, hubError } = useAuth()
  const { hubOnly, hubEnabled, hubUrl } = useAuthConfig()
  const [busy, setBusy] = useState(false)
  const [framed] = useState(isFramed)
  const showHub = hubOnly || !!hubError || (framed && hubEnabled)

  const onGoogle = async () => {
    setBusy(true)
    await signIn()
    setBusy(false)
  }

  return (
    <LoginShell shakeKey={signInError}>
      <LoginCardHeader
        title="Acessar plataforma"
        text="Acesso com conta Google para controle de permissões por papel."
      />

      {showHub ? (
        <LoginNotice>
          <p className="text-sm font-semibold text-[#252423]">
            Acesse pelo Hub Apps
          </p>
          <p className="mt-1 text-xs leading-relaxed text-neutral-700">
            {framed
              ? 'Sua sessão terminou. Use o botão Recarregar do Hub ou abra as Assinaturas de novo.'
              : 'As Assinaturas abrem dentro do Hub Apps. Entre no Hub e clique em Gestor de Assinaturas.'}
          </p>
          {hubError && (
            <p
              className="mt-1.5 break-words text-xs text-rose-800"
              role="alert"
            >
              {hubError}
            </p>
          )}
          <HubLink href={hubUrl} />
        </LoginNotice>
      ) : (
        <LoginNotice>
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/50 bg-amber-100/80 text-amber-700">
              <Shield className="h-5 w-5" strokeWidth={2} aria-hidden />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm text-[#252423]">
                Domínio liberado:{' '}
                <span className="font-semibold">@sebratel.com.br</span>
              </p>
              <p className="text-xs text-neutral-600">
                Toda a organização entra como Visualizador.
              </p>
            </div>
          </div>
        </LoginNotice>
      )}

      {signInError && (
        <div
          role="alert"
          className="flex gap-2 rounded-xl border border-rose-200/90 bg-rose-50/95 px-3 py-2.5 text-sm text-rose-900 shadow-sm"
        >
          <AlertCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-rose-600"
            aria-hidden
          />
          <span className="min-w-0 break-words">{signInError}</span>
        </div>
      )}

      <button
        type="button"
        onClick={() => void onGoogle()}
        disabled={busy}
        aria-busy={busy}
        className={cn(
          'group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl px-4 text-sm font-semibold text-[#252423] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:cursor-not-allowed disabled:opacity-60 motion-safe:hover:-translate-y-px motion-safe:active:translate-y-0',
          showHub
            ? 'min-h-[36px] border border-neutral-300 bg-white py-2 hover:bg-neutral-50'
            : 'min-h-[44px] bg-[#FFB800] py-3.5 shadow-md hover:bg-[#e6a800] hover:shadow-lg'
        )}
      >
        {busy ? (
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        ) : (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5">
            <GoogleMark className="h-5 w-5" />
          </span>
        )}
        <span>
          {busy
            ? 'Autenticando…'
            : showHub
              ? 'Entrar com Google (master)'
              : 'Entrar com Google'}
        </span>
      </button>

      <LoginHelp />
    </LoginShell>
  )
}
