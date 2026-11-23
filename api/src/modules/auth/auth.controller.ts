import { Controller, Get } from '@nestjs/common';
import { ApiResponseHelper } from '../../common/helpers/api-response.helper.js';
import { CurrentUser } from './auth.decorators.js';
import { AuthService, type AuthUser } from './auth.service.js';

/** Quem está logado. O frontend chama depois do login: 200 = entra; 403 = tela de "sem acesso". */
@Controller('v1/me')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  me(@CurrentUser() user: AuthUser) {
    return ApiResponseHelper.ok({ email: user.email, name: user.name, authEnabled: this.authService.settings.enabled });
  }
}
