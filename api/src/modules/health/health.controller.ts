import { Controller, Get } from '@nestjs/common';
import { DirectoryService } from '../directory/directory.service.js';

/** Health check de infraestrutura (Docker/Portainer): fora do /v1 e sem envelope. */
@Controller('health')
export class HealthController {
  constructor(private readonly directoryService: DirectoryService) {}

  @Get()
  async check() {
    const directory = await this.directoryService.getStatus();
    return {
      status: 'ok',
      service: 'assinaturas-gmail-api',
      uptimeSeconds: Math.round(process.uptime()),
      directory: { source: directory.source, lastSyncAt: directory.lastSyncAt, ok: directory.lastError === null },
    };
  }
}
