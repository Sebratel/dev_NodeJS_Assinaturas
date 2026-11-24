import { ExternalLink } from 'lucide-react'

/**
 * Abre o Hub Apps na janela inteira (target="_top"): dentro de um quadro, um link comum abriria o Hub dentro
 * do próprio sistema.
 */
export function HubLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_top"
      rel="noopener"
      className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-neutral-900 shadow-sm transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
    >
      <ExternalLink className="size-4" aria-hidden />
      Abrir o Hub Apps
    </a>
  )
}
