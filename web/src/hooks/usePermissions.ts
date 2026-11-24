import { useQuery } from '@tanstack/react-query'
import { meService } from '../services/me.service'
import { queryKeys } from '../services/query-keys'
import type { UserRole } from '../types/api'

export const ROLE_LABELS: Record<UserRole, string> = {
  MASTER: 'Master',
  EDITOR: 'Editor',
  VIEWER: 'Visualizador',
}

export interface Permissions {
  role: UserRole
  roleLabel: string
  /** Regras, modelos, frases, celular informado, sinônimos e de-para. */
  canEdit: boolean
  /** Gravar no Gmail, desfazer e automação. */
  canApply: boolean
  /** Configurações técnicas (campos do AD, diretório, Google) e a tela Usuários. */
  isMaster: boolean
}

/**
 * O que a tela oferece a cada perfil. A API confere de novo em toda gravação (403 ROLE_FORBIDDEN):
 * aqui é só para não mostrar botão que vai dar erro. Sem perfil conhecido, vale o mais restrito.
 */
export function permissionsFor(role: UserRole | null | undefined): Permissions {
  const effective: UserRole = role ?? 'VIEWER'
  const isMaster = effective === 'MASTER'
  return {
    role: effective,
    roleLabel: ROLE_LABELS[effective],
    canEdit: isMaster || effective === 'EDITOR',
    canApply: isMaster,
    isMaster,
  }
}

/** Perfil de quem está logado, lido do GET /v1/me (a mesma consulta do AuthGate, sem pedir de novo). */
export function usePermissions(): Permissions {
  const me = useQuery({
    queryKey: queryKeys.me,
    queryFn: meService.get,
    staleTime: 5 * 60_000,
    retry: false,
  })
  return permissionsFor(me.data?.role)
}
