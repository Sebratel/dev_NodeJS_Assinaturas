import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { resolve } from 'node:path';
import { SettingsModule } from '../settings/settings.module.js';
import { DirectorySyncJob } from './directory-sync.job.js';
import { DirectoryController } from './directory.controller.js';
import { DirectoryService } from './directory.service.js';
import { CollaboratorOverrideEntity } from './entities/collaborator-override.entity.js';
import { DIRECTORY_SOURCE, DirectorySource } from './sources/directory-source.interface.js';
import { LdapDirectorySource } from './sources/ldap-directory.source.js';
import { SnapshotDirectorySource } from './sources/snapshot-directory.source.js';
import { WindowsLoginDirectorySource } from './sources/windows-login-directory.source.js';

function buildDirectorySource(config: ConfigService): DirectorySource {
  const kind = String(config.get('DIRECTORY_SOURCE') ?? 'snapshot').toLowerCase();
  if (kind === 'ldap') {
    const required = ['AD_URL', 'AD_BIND_USER', 'AD_BIND_PASSWORD', 'AD_BASE_DN'];
    const missing = required.filter((name) => !config.get(name));
    if (missing.length) throw new Error(`DIRECTORY_SOURCE=ldap exige ${missing.join(', ')}.`);
    return new LdapDirectorySource({
      url: config.getOrThrow('AD_URL'),
      bindUser: config.getOrThrow('AD_BIND_USER'),
      bindPassword: config.getOrThrow('AD_BIND_PASSWORD'),
      baseDn: config.getOrThrow('AD_BASE_DN'),
    });
  }
  if (kind === 'snapshot') {
    return new SnapshotDirectorySource(resolve(config.get('DIRECTORY_SNAPSHOT_PATH') ?? '../data/ad-snapshot.json'));
  }
  if (kind === 'windows') {
    const server = String(config.get('AD_URL') ?? 'ldap://10.0.11.251').replace(/^ldaps?:\/\//, '').replace(/:\d+$/, '');
    return new WindowsLoginDirectorySource(resolve(config.get('AD_EXPORT_SCRIPT') ?? '../scripts/exportar-ad.ps1'), server);
  }
  throw new Error(`DIRECTORY_SOURCE inválido: "${kind}" (use ldap, windows ou snapshot).`);
}

@Module({
  imports: [SettingsModule, TypeOrmModule.forFeature([CollaboratorOverrideEntity])],
  controllers: [DirectoryController],
  providers: [
    { provide: DIRECTORY_SOURCE, inject: [ConfigService], useFactory: buildDirectorySource },
    DirectoryService,
    DirectorySyncJob,
  ],
  exports: [DirectoryService],
})
export class DirectoryModule {}
