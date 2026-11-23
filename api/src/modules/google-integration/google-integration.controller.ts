import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiResponseHelper } from '../../common/helpers/api-response.helper.js';
import { SettingsService } from '../settings/settings.service.js';
import { SettingKeyEnum } from '../settings/types/setting-key.enum.js';
import { DIRECTORY_USER_SCOPE, GMAIL_SETTINGS_SCOPE, GoogleCredentialsService } from './google-credentials.service.js';

@Controller('v1/google-integration')
export class GoogleIntegrationController {
  constructor(
    private readonly credentials: GoogleCredentialsService,
    private readonly configService: ConfigService,
    private readonly settingsService: SettingsService,
  ) {}

  @Get()
  async getStatus() {
    return ApiResponseHelper.ok(await this.buildStatus(false));
  }

  /** Refaz o teste de delegação agora (não grava nada no Gmail). */
  @Post('check')
  @HttpCode(200)
  async check() {
    return ApiResponseHelper.ok(await this.buildStatus(true));
  }

  private async buildStatus(force: boolean) {
    const [delegation, applyScope] = await Promise.all([
      this.credentials.checkDelegation(force),
      this.settingsService.findOne(SettingKeyEnum.APPLY_SCOPE),
    ]);
    return {
      status: delegation.status,
      error: delegation.error,
      projectId: this.configService.get<string>('GOOGLE_PROJECT_ID') ?? null,
      clientId: this.credentials.clientId(),
      keyFilePresent: this.credentials.isConfigured(),
      testUser: this.credentials.testSubject() || null,
      scopes: [GMAIL_SETTINGS_SCOPE, DIRECTORY_USER_SCOPE],
      applyScope,
      applyEnabled: delegation.status === 'AUTHORIZED',
    };
  }
}
