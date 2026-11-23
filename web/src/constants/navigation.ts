import {
  Activity,
  LayoutTemplate,
  MessageSquareQuote,
  Settings2,
  SlidersHorizontal,
  Users,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Texto do cabeçalho da página quando ela não passa um próprio. */
  description: string
}

/** Seções do menu lateral. O título e o ícone do cabeçalho de cada página saem daqui. */
export const NAV_ITEMS: NavItem[] = [
  {
    to: '/colaboradores',
    label: 'Colaboradores',
    icon: Users,
    description:
      'Quem está no AD, a assinatura que cada pessoa recebe e a gravação no Gmail.',
  },
  {
    to: '/regras',
    label: 'Regras',
    icon: SlidersHorizontal,
    description:
      'O que cada pessoa recebe, por nível, área, time, cargo ou empresa.',
  },
  {
    to: '/modelos',
    label: 'Modelos',
    icon: LayoutTemplate,
    description:
      'O layout da assinatura. As regras escolhem qual usar; sem escolha, vale o padrão.',
  },
  {
    to: '/frases',
    label: 'Frases',
    icon: MessageSquareQuote,
    description: 'A frase que fecha a assinatura, por perfil ou por time.',
  },
  {
    to: '/monitoramento',
    label: 'Monitoramento',
    icon: Activity,
    description:
      'Gravações automáticas, quem entrou no AD e quem ainda não tem regra.',
  },
  {
    to: '/configuracoes',
    label: 'Configurações',
    icon: Settings2,
    description:
      'De onde vem cada campo do AD, níveis do cargo, de-para de times, diretório e Google.',
  },
]

export function findNavItem(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => pathname.startsWith(item.to))
}
