import { Controller, Get } from '@nestjs/common';
import { ApiResponseHelper } from '../../common/helpers/api-response.helper.js';
import { UsersService } from '../users/users.service.js';
import { CurrentUser } from './auth.decorators.js';
import { AuthService, type AuthUser } from './auth.service.js';

/** Quem está logado. O frontend chama depois do login: 200 = entra (com o perfil); 403 = tela de "sem acesso". */
@Controller('v1/me')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  async me(@CurrentUser() user: AuthUser) {
    // Uma vez por sessão: alimenta o "último acesso" da tela Usuários. Falhar aqui não impede a entrada.
    if (this.authService.settings.enabled) await this.usersService.touchLogin(user.email, user.name).catch(() => undefined);
    return ApiResponseHelper.ok({ email: user.email, name: user.name, role: user.role, authEnabled: this.authService.settings.enabled });
  }
}
