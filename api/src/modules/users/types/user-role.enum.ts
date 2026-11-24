/** Perfis de acesso. Cada perfil pode tudo o que os anteriores podem (VIEWER < EDITOR < MASTER). */
export enum UserRoleEnum {
  /** Vê tudo, simula e pré-visualiza. Não grava nada. */
  VIEWER = 'VIEWER',
  /** + regras, modelos, frases, de-para e celular informado. */
  EDITOR = 'EDITOR',
  /** + gravação no Gmail (aplicar, desfazer, automação), configurações técnicas e usuários. */
  MASTER = 'MASTER',
}

const RANK: Record<UserRoleEnum, number> = {
  [UserRoleEnum.VIEWER]: 0,
  [UserRoleEnum.EDITOR]: 1,
  [UserRoleEnum.MASTER]: 2,
};

export const ROLE_LABEL: Record<UserRoleEnum, string> = {
  [UserRoleEnum.VIEWER]: 'Visualizador',
  [UserRoleEnum.EDITOR]: 'Editor',
  [UserRoleEnum.MASTER]: 'Master',
};

export function hasRole(role: UserRoleEnum, required: UserRoleEnum): boolean {
  return RANK[role] >= RANK[required];
}
