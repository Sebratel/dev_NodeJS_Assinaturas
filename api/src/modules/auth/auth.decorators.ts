import { createParamDecorator, type ExecutionContext, HttpStatus, SetMetadata } from '@nestjs/common';
import type { Request } from 'express';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { hasRole, ROLE_LABEL, UserRoleEnum } from '../users/types/user-role.enum.js';
import type { AuthUser } from './auth.service.js';

export const IS_PUBLIC_KEY = 'isPublic';
export const REQUIRED_ROLE_KEY = 'requiredRole';

/** Rota sem login (só infraestrutura: health). Todo o resto passa pelo guard global. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Perfil mínimo da rota (no método ou no controller). Sem o decorator, basta estar logado (VIEWER):
 * rota que grava algo PRECISA dele. VIEWER < EDITOR < MASTER.
 */
export const RequireRole = (role: UserRoleEnum) => SetMetadata(REQUIRED_ROLE_KEY, role);

/** 403 ROLE_FORBIDDEN: logado, mas o perfil não alcança a ação (diferente do AUTH_FORBIDDEN, que é "sem acesso"). */
export function assertRole(user: AuthUser, required: UserRoleEnum): void {
  if (hasRole(user.role, required)) return;
  throw new BusinessException(
    'ROLE_FORBIDDEN',
    `Seu perfil (${ROLE_LABEL[user.role]}) não permite esta ação. Precisa de ${ROLE_LABEL[required]}: peça a um master.`,
    HttpStatus.FORBIDDEN,
  );
}

export type AuthenticatedRequest = Request & { user?: AuthUser };

/** Usuário autenticado pelo guard. Em rota sem guard (pública) não existe: usar ali é erro de programação. */
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthUser => {
  const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
  if (!user) throw new Error('CurrentUser usado em rota sem autenticação.');
  return user;
});
