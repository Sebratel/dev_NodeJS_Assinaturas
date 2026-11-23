import type { ReactNode } from 'react'

/** Moldura das telas fora da casca (login, acesso negado): logo, título e o conteúdo num cartão. */
export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: ReactNode
  children: ReactNode
}) {
  return (
    <main className="grid min-h-dvh place-items-center bg-surface px-4 py-10 text-on-surface">
      <div className="w-full max-w-sm rounded-3xl border border-neutral-200/90 bg-surface-container-lowest p-8 text-center shadow-[0_8px_24px_-4px_rgba(15,23,42,0.08)] animate-fade-in-up motion-reduce:animate-none dark:border-white/10">
        <img
          src="/sebratel-logo.png"
          alt="Sebratel"
          className="mx-auto h-10 w-auto object-contain dark:brightness-0 dark:invert"
        />
        <h1 className="mt-6 text-xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-on-surface-variant">{subtitle}</p>
        <div className="mt-6 grid gap-3">{children}</div>
      </div>
    </main>
  )
}
