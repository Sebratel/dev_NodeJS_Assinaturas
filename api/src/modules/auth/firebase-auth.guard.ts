import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getRequestContext } from '../../common/logging/request-context.js';
import { UserRoleEnum } from '../users/types/user-role.enum.js';
import { assertRole, type AuthenticatedRequest, IS_PUBLIC_KEY, REQUIRED_ROLE_KEY } from './auth.decorators.js';
import { AuthService } from './auth.service.js';

/** Guard global: toda rota exige login, menos as marcadas com @Public(); e o perfil mínimo do @RequireRole (padrão VIEWER). */
@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = await this.authService.authenticate(request.headers.authorization);
    request.user = user;
    // O log de acesso e os logs dos serviços passam a levar o e-mail de quem pediu.
    const store = getRequestContext(request);
    if (store) store.userEmail = user.email;

    const required = this.reflector.getAllAndOverride<UserRoleEnum | undefined>(REQUIRED_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    assertRole(user, required ?? UserRoleEnum.VIEWER);
    return true;
  }
}
