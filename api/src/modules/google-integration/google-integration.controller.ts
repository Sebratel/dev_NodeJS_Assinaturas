import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync } from 'node:fs';
import { ApiResponseHelper } from '../../common/helpers/api-response.helper.js';

/**
 * Estado da integração com o Google. Nesta versão só informa: a gravação no Gmail entra quando o superadmin
 * autorizar a delegação em todo o domínio para a conta de serviço.
 */
@Controller('v1/google-integration')
export class GoogleIntegrationController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  getStatus() {
    const keyFile = this.configService.get<string>('GOOGLE_SERVICE_ACCOUNT_KEY_FILE') ?? '';
    const keyFilePresent = Boolean(keyFile) && existsSync(keyFile);
    return ApiResponseHelper.ok({
      status: keyFilePresent ? 'AWAITING_AUTHORIZATION' : 'NOT_CONFIGURED',
      projectId: this.configService.get<string>('GOOGLE_PROJECT_ID') ?? null,
      clientId: this.configService.get<string>('GOOGLE_SERVICE_ACCOUNT_CLIENT_ID') ?? null,
      keyFilePresent,
      scopes: ['https://www.googleapis.com/auth/gmail.settings.basic', 'https://www.googleapis.com/auth/admin.directory.user'],
      applyEnabled: false,
    });
  }
}
