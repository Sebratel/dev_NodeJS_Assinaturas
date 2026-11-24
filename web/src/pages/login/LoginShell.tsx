import { Info, Lock } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

const HERO = '/login-hero.png'
const LOGO = '/logo-circular-sebratel.png'
/** Mesma etiqueta no topo da marca e no cartão. */
export const SYSTEM_LABEL = 'Assinaturas Sebratel'

/** Decoração âmbar e "rede" sobre a imagem de fundo (igual ao Data Hub e ao churn_mvp). */
function HeroDecor() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      <div className="absolute -left-[15%] top-[18%] h-[min(85vw,520px)] w-[min(85vw,520px)] rounded-full bg-[#ffb000]/20 blur-[88px] animate-login-glow-a motion-reduce:animate-none" />
      <div className="absolute -right-[8%] bottom-[12%] h-[min(70vw,420px)] w-[min(70vw,420px)] rounded-full bg-[#ff9e2c]/15 blur-[72px] animate-login-glow-b motion-reduce:animate-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_55%_at_45%_42%,rgba(255,176,0,0.14),transparent_68%)] mix-blend-screen" />
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.18] mix-blend-screen"
        viewBox="0 0 1200 780"
        preserveAspectRatio="xMidYMid slice"
      >
        <path
          d="M0,520 Q280,380 520,460 T920,400 T1200,360"
          fill="none"
          stroke="rgba(255,184,0,0.65)"
          strokeWidth="1.25"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M80,620 Q420,520 720,560 T1180,480"
          fill="none"
          stroke="rgba(255,143,0,0.45)"
          strokeWidth="1"
          opacity="0.8"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M200,180 Q520,280 780,200 T1120,240"
          fill="none"
          stroke="rgba(255,184,0,0.35)"
          strokeWidth="0.85"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  )
}

/**
 * Moldura das telas fora do sistema (login e "sem acesso") no padrão visual "Operação Sebratel", o mesmo do
 * Data Hub (lakehouse_sebratel/apps/web/src/features/auth/LoginPage.tsx) e do churn_mvp: imagem em tela cheia,
 * marca à esquerda, cartão creme à direita e a faixa "Ambiente seguro e monitorado".
 * O cartão usa cores fixas: fica igual no tema claro e no escuro.
 */
export function LoginShell({
  children,
  shakeKey = null,
}: {
  children: ReactNode
  /** Erro ao entrar: o cartão treme a cada valor novo (como no Data Hub). */
  shakeKey?: string | null
}) {
  return (
    <div className="relative min-h-svh w-full overflow-hidden bg-[#0c0a08] text-[#252423]">
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <div
          className="absolute inset-[-3%] bg-cover bg-[center_32%] bg-no-repeat animate-login-hero motion-reduce:animate-none sm:bg-[left_28%_center] lg:bg-[left_22%_center]"
          style={{ backgroundImage: `url(${HERO})` }}
        />
        <HeroDecor />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-[#0f0d0b]/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/40" />
        <div className="absolute inset-0 bg-black/15" />
      </div>

      <div className="relative z-10 flex min-h-svh w-full flex-col pb-16 lg:flex-row lg:items-center lg:pb-20">
        <div className="order-1 flex flex-col gap-3 px-4 pt-10 text-white lg:min-h-svh lg:flex-1 lg:justify-end lg:pb-32 lg:pl-10 lg:pr-6 lg:pt-0 xl:pl-14">
          <div className="flex items-center gap-3 drop-shadow-md animate-login-brand motion-reduce:animate-none">
            <img
              src={LOGO}
              alt=""
              width={44}
              height={44}
              className="h-11 w-11 rounded-full object-contain shadow-lg ring-1 ring-white/40"
            />
            <span className="text-[13px] font-extrabold uppercase tracking-[0.24em] drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] sm:text-[14px]">
              {SYSTEM_LABEL}
            </span>
          </div>
          <h2 className="max-w-xl text-balance text-[17px] font-bold leading-[1.15] tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.75)] animate-login-brand [animation-delay:80ms] motion-reduce:animate-none sm:text-[19px] lg:text-[2rem] xl:text-4xl">
            As assinaturas de e-mail da empresa,{' '}
            <span className="text-[#FFC107]">no mesmo padrão.</span>
          </h2>
          <p className="max-w-md text-sm leading-relaxed drop-shadow-[0_1px_8px_rgba(0,0,0,0.8)] animate-login-brand [animation-delay:160ms] motion-reduce:animate-none sm:text-[13px]">
            Regras por nível, área e time, com os dados do AD, gravadas direto
            no Gmail.
          </p>
        </div>

        <div className="order-2 flex w-full flex-1 flex-col items-center justify-center px-4 py-10 lg:w-[min(100%,460px)] lg:flex-none lg:px-8 lg:motion-safe:-translate-x-12 xl:pr-16">
          <div className="relative z-10 w-full max-w-[440px] animate-login-card motion-reduce:animate-none">
            <div
              key={shakeKey ?? 'parado'}
              className={cn(
                'relative overflow-hidden rounded-2xl border border-white/60 bg-[#FBFAF5] shadow-[0_36px_72px_-12px_rgba(0,0,0,0.62)] ring-1 ring-black/5 sm:rounded-3xl',
                shakeKey && 'animate-login-shake motion-reduce:animate-none'
              )}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ffb000]/45 to-transparent" />
              <div className="relative space-y-4 p-7 sm:p-8">{children}</div>
            </div>
          </div>
        </div>
      </div>

      <footer className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-black/55 py-2.5 text-center text-[11px] text-white/90 backdrop-blur-md supports-[backdrop-filter]:bg-black/40">
        <span className="inline-flex items-center justify-center gap-2 px-4">
          <Lock
            className="h-3.5 w-3.5 shrink-0 opacity-90"
            strokeWidth={2}
            aria-hidden
          />
          Ambiente seguro e monitorado.
        </span>
      </footer>
    </div>
  )
}

/** Cabeçalho do cartão: etiqueta do sistema, título e frase. */
export function LoginCardHeader({
  title,
  text,
}: {
  title: string
  text: ReactNode
}) {
  return (
    <header className="space-y-2">
      <span className="inline-flex rounded-full border border-amber-300/70 bg-amber-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-900">
        {SYSTEM_LABEL}
      </span>
      <h1 className="text-[17px] font-bold tracking-tight text-[#252423] sm:text-[1.65rem]">
        {title}
      </h1>
      <p className="text-sm leading-relaxed text-neutral-700">{text}</p>
    </header>
  )
}

/** Caixa creme com borda âmbar (aviso de domínio, chamada para o Hub). */
export function LoginNotice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-amber-300/80 bg-[#FFFBEB] p-3 shadow-sm">
      {children}
    </div>
  )
}

/** "Problemas para acessar?" e a linha "ou", como no Data Hub. */
export function LoginHelp() {
  return (
    <>
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-neutral-200" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
          ou
        </span>
        <div className="h-px flex-1 bg-neutral-200" />
      </div>
      <p className="text-center text-[11px]">
        <a
          href="mailto:intel@sebratel.com.br?subject=Acesso%20%E2%80%94%20Assinaturas%20Sebratel&body=Descreva%20o%20problema%20e%20o%20seu%20e-mail%20corporativo."
          className="inline-flex items-center justify-center gap-1.5 font-medium text-amber-800 underline-offset-2 transition hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
        >
          <Info className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
          Problemas para acessar?
        </a>
      </p>
    </>
  )
}
