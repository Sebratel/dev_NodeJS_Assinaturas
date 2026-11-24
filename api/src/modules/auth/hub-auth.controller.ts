import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { IsString, MaxLength } from 'class-validator';
import { ApiResponseHelper } from '../../common/helpers/api-response.helper.js';
import { UsersService } from '../users/users.service.js';
import { Public } from './auth.decorators.js';
import { AuthService } from './auth.service.js';
import { HubSsoService } from './hub-sso.service.js';

export class HubTokenDTO {
  @IsString()
  @MaxLength(4096)
  token: string;
}

/** Entrada pelo Hub Apps. Públicas: a tela chama antes de existir sessão. */
@Controller('v1/auth')
export class HubAuthController {
  constructor(
    private readonly hubSso: HubSsoService,
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  /** O que a tela de login precisa saber antes do login: se o acesso é só pelo Hub e para onde mandar. */
  @Public()
  @Get('config')
  config() {
    return ApiResponseHelper.ok({ hubOnly: this.hubSso.isHubOnly(), hubEnabled: this.hubSso.isConfigured(), hubUrl: this.hubSso.hubUrl });
  }

  /** Troca o token de 5 min do Hub (uso único) por uma sessão de 8 h. Quem pode entrar continua sendo a tela Usuários. */
  @Public()
  @Post('hub')
  @HttpCode(200)
  async exchange(@Body() dto: HubTokenDTO) {
    const identity = this.hubSso.exchange(dto.token);
    const user = await this.authService.withRole(identity.email, identity.name);
    const session = this.hubSso.issueSession(identity);
    await this.usersService.touchLogin(user.email, user.name).catch(() => undefined);
    return ApiResponseHelper.ok({ ...session, user: { email: user.email, name: user.name, role: user.role } });
  }
}
