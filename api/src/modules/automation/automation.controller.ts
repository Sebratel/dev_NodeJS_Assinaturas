import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiResponseHelper } from '../../common/helpers/api-response.helper.js';
import { CurrentUser } from '../auth/auth.decorators.js';
import type { AuthUser } from '../auth/auth.service.js';
import { DirectoryService } from '../directory/directory.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { SettingKeyEnum } from '../settings/types/setting-key.enum.js';
import { SignatureApplicationsService } from '../signature-applications/signature-applications.service.js';
import { AutoApplyService } from './auto-apply.service.js';

const RECENT_DAYS = 14;

/** Monitoramento da gravação automática: configuração, última execução, aprovação, entradas recentes e histórico. */
@Controller('v1/automation')
export class AutomationController {
  constructor(
    private readonly autoApplyService: AutoApplyService,
    private readonly settingsService: SettingsService,
    private readonly applicationsService: SignatureApplicationsService,
    private readonly directoryService: DirectoryService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  async getOverview() {
    const [settings, recentApplications, recentEntries, directory] = await Promise.all([
      this.settingsService.findOne(SettingKeyEnum.AUTO_APPLY),
      this.applicationsService.findHistory(undefined, 40),
      this.autoApplyService.recentEntries(RECENT_DAYS),
      this.directoryService.getStatus(),
    ]);
    const minutes = Number(this.configService.get('DIRECTORY_SYNC_INTERVAL_MINUTES') ?? 10);
    const nextCheckAt =
      directory.lastSyncAt && minutes > 0 ? new Date(new Date(directory.lastSyncAt).getTime() + minutes * 60_000).toISOString() : null;
    return ApiResponseHelper.ok({
      settings,
      ...this.autoApplyService.getState(),
      checkIntervalMinutes: minutes,
      lastCheckAt: directory.lastSyncAt,
      nextCheckAt,
      recentDays: RECENT_DAYS,
      recentEntries,
      recentApplications,
    });
  }

  /** Lê o AD agora e roda a automação (se ligada), em nome de quem clicou. */
  @Post('run')
  @HttpCode(200)
  async runNow(@CurrentUser() user: AuthUser) {
    await this.directoryService.sync({ notifyListeners: false });
    return ApiResponseHelper.ok(await this.autoApplyService.run('MANUAL', user.email));
  }

  @Post('approve')
  @HttpCode(200)
  async approve(@CurrentUser() user: AuthUser) {
    return ApiResponseHelper.ok(await this.autoApplyService.approve(user.email));
  }
}
