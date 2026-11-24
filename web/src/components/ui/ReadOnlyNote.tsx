import { Lock } from 'lucide-react'
import { usePermissions } from '../../hooks/usePermissions'
import { cn } from '../../utils/cn'

/** Linha discreta para quem abre uma tela que o perfil não deixa alterar. */
export function ReadOnlyNote({
  needs = 'Editor',
  className,
}: {
  /** Perfil mínimo para alterar, no texto: "Editor" ou "Master". */
  needs?: 'Editor' | 'Master'
  className?: string
}) {
  const { roleLabel } = usePermissions()
  return (
    <p
      className={cn(
        'flex items-center gap-1.5 text-xs text-on-surface-variant',
        className
      )}
    >
      <Lock className="size-3.5 shrink-0" aria-hidden />
      Somente leitura: seu perfil é {roleLabel}. Alterar exige {needs}.
    </p>
  )
}
