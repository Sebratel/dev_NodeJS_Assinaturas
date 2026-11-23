import { Controller, Get } from '@nestjs/common';
import { SERVICE_NAME } from '../../common/logging/app-logger.js';
import { APP_VERSION } from '../../config/app-version.js';
import { Public } from '../auth/auth.decorators.js';
import { DirectoryService } from '../directory/directory.service.js';

/** Health check de infraestrutura (Docker/Portainer/CI): sem login, fora do /v1 e sem envelope. Só lê memória. */
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly directoryService: DirectoryService) {}

  @Get()
  async check() {
    const directory = await this.directoryService.getStatus();
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: SERVICE_NAME,
      version: APP_VERSION,
      uptimeSeconds: Math.round(process.uptime()),
      directory: { source: directory.source, lastSyncAt: directory.lastSyncAt, ok: directory.lastError === null },
    };
  }
}
