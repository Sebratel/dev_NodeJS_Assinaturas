import {
  Activity,
  LayoutTemplate,
  MessageSquareQuote,
  Settings2,
  ShieldCheck,
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
  /** Só aparece no menu para o perfil Master. */
  masterOnly?: boolean
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
  {
    to: '/usuarios',
    label: 'Usuários',
    icon: ShieldCheck,
    description:
      'Toda a organização vê o sistema como Visualizador. Aqui você dá perfil de Editor (regras, modelos e frases) ou Master (gravar no Gmail).',
    masterOnly: true,
  },
]

export function findNavItem(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => pathname.startsWith(item.to))
}
