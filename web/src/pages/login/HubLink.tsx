import { ExternalLink } from 'lucide-react'

/**
 * Leva ao Hub Apps na janela inteira (target="_top"): dentro do quadro do Hub, um link comum abriria o Hub
 * dentro do próprio sistema. Mesmo botão do Data Hub.
 */
export function HubLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_top"
      rel="noopener"
      className="mt-2.5 inline-flex min-h-[36px] w-full items-center justify-center gap-2 rounded-xl bg-[#FFB800] px-4 text-sm font-semibold text-[#252423] shadow-sm transition hover:bg-[#e6a800] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
    >
      <ExternalLink className="h-4 w-4" aria-hidden />
      Ir para o Hub Apps
    </a>
  )
}
