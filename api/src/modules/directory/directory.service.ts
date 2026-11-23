import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { TextHelper } from '../../common/helpers/text.helper.js';
import { SettingsService } from '../settings/settings.service.js';
import { SettingKeyEnum } from '../settings/types/setting-key.enum.js';
import { CollaboratorMapper, MapperSettings } from './collaborator.mapper.js';
import { CollaboratorOverrideEntity } from './entities/collaborator-override.entity.js';
import { BASE_ATTRIBUTES, DIRECTORY_SOURCE, DirectorySource } from './sources/directory-source.interface.js';
import { Collaborator, RawDirectoryEntry } from './types/collaborator.js';

export interface DirectoryStatus {
  source: DirectorySource['kind'];
  lastSyncAt: string | null;
  lastSyncDurationMs: number | null;
  lastError: string | null;
  accountsRead: number;
  collaborators: number;
}

@Injectable()
export class DirectoryService {
  private readonly logger = new Logger(DirectoryService.name);
  private entries: RawDirectoryEntry[] = [];
  private lastSyncAt: Date | null = null;
  private lastSyncDurationMs: number | null = null;
  private lastError: string | null = null;
  private syncing: Promise<DirectoryStatus> | null = null;
  private dataVersion = 0;
  private cache: { key: string; collaborators: Collaborator[] } | null = null;
  /** Quem quer saber que uma leitura do AD terminou bem (ex.: gravação automática). */
  private readonly syncListeners: Array<() => Promise<void>> = [];

  constructor(
    @Inject(DIRECTORY_SOURCE) private readonly source: DirectorySource,
    private readonly settingsService: SettingsService,
    @InjectRepository(CollaboratorOverrideEntity) private readonly overrideRepository: Repository<CollaboratorOverrideEntity>,
  ) {}

  onSynced(listener: () => Promise<void>): void {
    this.syncListeners.push(listener);
  }

  /** Lê o diretório de novo. Se falhar, mantém a última leitura boa e registra o erro (não zera a lista). */
  sync(): Promise<DirectoryStatus> {
    if (this.syncing) return this.syncing;
    this.syncing = this.runSync().finally(() => (this.syncing = null));
    return this.syncing;
  }

  private async runSync(): Promise<DirectoryStatus> {
    const started = Date.now();
    try {
      const sources = await this.settingsService.findOne(SettingKeyEnum.FIELD_SOURCES);
      const attributes = [...new Set([...BASE_ATTRIBUTES, ...Object.values(sources)])];
      this.entries = await this.source.fetchEntries(attributes);
      this.lastError = null;
      this.dataVersion++;
      this.logger.log(`Diretório lido (${this.source.kind}): ${this.entries.length} contas ativas em ${Date.now() - started} ms`);
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      this.logger.error(`Falha ao ler o diretório (${this.source.kind}): ${this.lastError}`);
    } finally {
      this.lastSyncAt = new Date();
      this.lastSyncDurationMs = Date.now() - started;
    }
    if (!this.lastError) {
      // Não espera: a leitura do AD não fica presa à gravação no Gmail.
      for (const listener of this.syncListeners) {
        listener().catch((error) => this.logger.error(`Após a leitura do AD: ${error instanceof Error ? error.message : String(error)}`));
      }
    }
    return this.getStatus();
  }

  async getStatus(): Promise<DirectoryStatus> {
    return {
      source: this.source.kind,
      lastSyncAt: this.lastSyncAt?.toISOString() ?? null,
      lastSyncDurationMs: this.lastSyncDurationMs,
      lastError: this.lastError,
      accountsRead: this.entries.length,
      collaborators: (await this.findAll()).length,
    };
  }

  /** Colaboradores com as configurações atuais. Recalcula só quando diretório, configuração ou celular informado mudam. */
  async findAll(): Promise<Collaborator[]> {
    const cacheKey = `${this.dataVersion}:${this.settingsService.getRevision()}`;
    if (this.cache?.key === cacheKey) return this.cache.collaborators;

    const all = await this.settingsService.findAll();
    const settings: MapperSettings = {
      [SettingKeyEnum.FIELD_SOURCES]: all[SettingKeyEnum.FIELD_SOURCES],
      [SettingKeyEnum.LEVEL_SYNONYMS]: all[SettingKeyEnum.LEVEL_SYNONYMS],
      [SettingKeyEnum.VALUE_ALIASES]: all[SettingKeyEnum.VALUE_ALIASES],
      [SettingKeyEnum.DIRECTORY_FILTERS]: all[SettingKeyEnum.DIRECTORY_FILTERS],
    };
    const overrides = new Map((await this.overrideRepository.find()).map((o) => [o.collaboratorId, o.informedMobile]));
    const collaborators = this.entries
      .map((raw) => CollaboratorMapper.toCollaborator(raw, settings, overrides.get(String(raw.objectGUID ?? raw.sAMAccountName ?? '')) ?? ''))
      .filter((c): c is Collaborator => c !== null)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    this.cache = { key: cacheKey, collaborators };
    return collaborators;
  }

  async findOne(id: string): Promise<Collaborator> {
    const found = (await this.findAll()).find((c) => c.id === id);
    if (!found) throw new BusinessException('COLLABORATOR_NOT_FOUND', 'Colaborador não encontrado no diretório.', HttpStatus.NOT_FOUND);
    return found;
  }

  async setInformedMobile(id: string, informedMobile: string): Promise<Collaborator> {
    await this.findOne(id);
    const digits = informedMobile.replace(/\D/g, '');
    if (digits && digits.length !== 11) {
      throw new BusinessException('COLLABORATOR_MOBILE_INVALID', 'Celular deve ter DDD + 9 dígitos.', HttpStatus.BAD_REQUEST, [
        { field: 'informedMobile', message: 'use o formato (51) 99999-0000.' },
      ]);
    }
    await this.overrideRepository.save({ collaboratorId: id, informedMobile: digits ? TextHelper.formatPhone(digits) : '' });
    this.dataVersion++;
    return this.findOne(id);
  }
}
