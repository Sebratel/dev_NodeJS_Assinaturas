import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from './auth.service.js';

export const IS_PUBLIC_KEY = 'isPublic';

/** Rota sem login (só infraestrutura: health). Todo o resto passa pelo guard global. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export type AuthenticatedRequest = Request & { user?: AuthUser };

/** Usuário autenticado pelo guard. Em rota sem guard (pública) não existe: usar ali é erro de programação. */
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthUser => {
  const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
  if (!user) throw new Error('CurrentUser usado em rota sem autenticação.');
  return user;
});
