import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiResponseHelper } from '../../common/helpers/api-response.helper.js';
import { assertRole, CurrentUser, RequireRole } from '../auth/auth.decorators.js';
import type { AuthUser } from '../auth/auth.service.js';
import { UserRoleEnum } from '../users/types/user-role.enum.js';
import { UpdateSettingDTO } from './dto/update-setting.dto.js';
import { SettingsService } from './settings.service.js';
import { SettingKeyEnum } from './types/setting-key.enum.js';

/**
 * Configurações técnicas (como o AD é lido e a gravação automática no Gmail) são de MASTER.
 * O resto (frases, de-para, níveis do cargo) muda o conteúdo da assinatura e fica com EDITOR.
 */
const MASTER_SETTINGS: ReadonlySet<string> = new Set([
  SettingKeyEnum.FIELD_SOURCES,
  SettingKeyEnum.DIRECTORY_FILTERS,
  SettingKeyEnum.AUTO_APPLY,
]);

@Controller('v1/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async findAll() {
    return ApiResponseHelper.ok(await this.settingsService.findAll());
  }

  @RequireRole(UserRoleEnum.EDITOR)
  @Put(':key')
  async update(@Param('key') key: string, @Body() body: UpdateSettingDTO, @CurrentUser() user: AuthUser) {
    if (MASTER_SETTINGS.has(key)) assertRole(user, UserRoleEnum.MASTER);
    return ApiResponseHelper.ok(await this.settingsService.update(key, body.value));
  }
}
