import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { DirectoryService } from './directory.service.js';

/** Lê o AD ao subir e a cada DIRECTORY_SYNC_INTERVAL_MINUTES (o LDAP não avisa quando alguém é criado). */
@Injectable()
export class DirectorySyncJob implements OnApplicationBootstrap {
  private readonly logger = new Logger(DirectorySyncJob.name);

  constructor(
    private readonly directoryService: DirectoryService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.directoryService.sync();
    const minutes = Number(this.configService.get('DIRECTORY_SYNC_INTERVAL_MINUTES') ?? 10);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      this.logger.warn('Sincronização automática desligada (DIRECTORY_SYNC_INTERVAL_MINUTES <= 0).');
      return;
    }
    const handle = setInterval(() => void this.directoryService.sync(), minutes * 60_000);
    this.schedulerRegistry.addInterval('directory-sync', handle);
    this.logger.log(`Sincronização do diretório a cada ${minutes} min.`);
  }
}
