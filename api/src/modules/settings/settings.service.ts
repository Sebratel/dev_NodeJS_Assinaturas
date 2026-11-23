import { HttpStatus, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { CollaboratorLevelEnum } from '../directory/types/collaborator-level.enum.js';
import { SOURCE_FIELDS } from '../directory/types/collaborator.js';
import { DEFAULT_SETTINGS } from './default-settings.js';
import { SettingEntity } from './entities/setting.entity.js';
import { SettingKeyEnum } from './types/setting-key.enum.js';
import { SettingsValues } from './types/settings-values.js';

const AD_ATTRIBUTE = /^[A-Za-z][A-Za-z0-9-]{0,63}$/;

@Injectable()
export class SettingsService implements OnModuleInit {
  /** Contador que muda a cada gravação: quem guarda cálculo derivado das configurações usa para invalidar. */
  private revision = 0;

  constructor(@InjectRepository(SettingEntity) private readonly settingRepository: Repository<SettingEntity>) {}

  async onModuleInit(): Promise<void> {
    for (const key of Object.values(SettingKeyEnum)) {
      const exists = await this.settingRepository.findOneBy({ key });
      if (!exists) await this.settingRepository.save({ key, value: DEFAULT_SETTINGS[key] });
    }
  }

  getRevision(): number {
    return this.revision;
  }

  async findAll(): Promise<SettingsValues> {
    const rows = await this.settingRepository.find();
    const result = { ...DEFAULT_SETTINGS } as Record<string, unknown>;
    for (const row of rows) result[row.key] = SettingsService.withDefaults(row.key as SettingKeyEnum, row.value);
    return result as unknown as SettingsValues;
  }

  async findOne<K extends SettingKeyEnum>(key: K): Promise<SettingsValues[K]> {
    const row = await this.settingRepository.findOneBy({ key });
    return SettingsService.withDefaults(key, row?.value ?? DEFAULT_SETTINGS[key]) as SettingsValues[K];
  }

  /** Configuração em objeto gravada antes de um campo novo existir recebe o padrão desse campo. */
  private static withDefaults(key: SettingKeyEnum, value: unknown): unknown {
    const fallback = DEFAULT_SETTINGS[key] as unknown;
    const isPlainObject = (v: unknown) => typeof v === 'object' && v !== null && !Array.isArray(v);
    return isPlainObject(fallback) && isPlainObject(value) ? { ...(fallback as object), ...(value as object) } : value;
  }

  async update(key: string, value: unknown): Promise<unknown> {
    if (!Object.values(SettingKeyEnum).includes(key as SettingKeyEnum)) {
      throw new BusinessException('SETTING_NOT_FOUND', `Configuração "${key}" não existe.`, HttpStatus.NOT_FOUND);
    }
    const problems = this.validate(key as SettingKeyEnum, value);
    if (problems.length) {
      throw new BusinessException('SETTING_INVALID', 'Configuração com valores inválidos.', HttpStatus.BAD_REQUEST, problems);
    }
    await this.settingRepository.save({ key, value });
    this.revision++;
    return value;
  }

  private validate(key: SettingKeyEnum, value: unknown): Array<{ field?: string; message: string }> {
    const problems: Array<{ field?: string; message: string }> = [];
    const isText = (v: unknown): v is string => typeof v === 'string';

    switch (key) {
      case SettingKeyEnum.FIELD_SOURCES: {
        const map = (value ?? {}) as Record<string, unknown>;
        for (const field of SOURCE_FIELDS) {
          if (!isText(map[field]) || !AD_ATTRIBUTE.test(map[field] as string)) {
            problems.push({ field, message: 'informe o nome de um atributo do AD (ex.: mobile, ipPhone).' });
          }
        }
        break;
      }
      case SettingKeyEnum.LEVEL_SYNONYMS: {
        const levels = Object.values(CollaboratorLevelEnum);
        if (!Array.isArray(value)) return [{ message: 'esperada uma lista de níveis.' }];
        value.forEach((item: { level?: unknown; words?: unknown }, i) => {
          if (!levels.includes(item?.level as CollaboratorLevelEnum)) problems.push({ field: `[${i}].level`, message: 'nível desconhecido.' });
          if (!Array.isArray(item?.words) || !item.words.every(isText)) problems.push({ field: `[${i}].words`, message: 'lista de palavras inválida.' });
        });
        break;
      }
      case SettingKeyEnum.VALUE_ALIASES: {
        if (!Array.isArray(value)) return [{ message: 'esperada uma lista de de-para.' }];
        value.forEach((item: { field?: unknown; from?: unknown; to?: unknown }, i) => {
          if (item?.field !== 'area' && item?.field !== 'team') problems.push({ field: `[${i}].field`, message: 'use area ou team.' });
          if (!isText(item?.from) || !item.from.trim() || !isText(item?.to) || !item.to.trim()) {
            problems.push({ field: `[${i}]`, message: 'de e para são obrigatórios.' });
          }
        });
        break;
      }
      case SettingKeyEnum.TEAM_PHRASES: {
        const phrases = value as { defaultPhrase?: unknown; byTeam?: unknown };
        if (!isText(phrases?.defaultPhrase) || phrases.defaultPhrase.length > 140) {
          problems.push({ field: 'defaultPhrase', message: 'frase padrão obrigatória, até 140 caracteres.' });
        }
        if (!Array.isArray(phrases?.byTeam)) return [...problems, { field: 'byTeam', message: 'esperada uma lista.' }];
        phrases.byTeam.forEach((item: { team?: unknown; phrase?: unknown }, i: number) => {
          if (!isText(item?.team) || !item.team.trim()) problems.push({ field: `byTeam[${i}].team`, message: 'time obrigatório.' });
          if (!isText(item?.phrase) || item.phrase.length > 140) problems.push({ field: `byTeam[${i}].phrase`, message: 'até 140 caracteres.' });
        });
        break;
      }
      case SettingKeyEnum.DIRECTORY_FILTERS: {
        const filters = value as { excludedOuKeywords?: unknown; requireEmail?: unknown };
        if (!Array.isArray(filters?.excludedOuKeywords) || !filters.excludedOuKeywords.every(isText)) {
          problems.push({ field: 'excludedOuKeywords', message: 'esperada uma lista de textos.' });
        }
        if (typeof filters?.requireEmail !== 'boolean') problems.push({ field: 'requireEmail', message: 'esperado verdadeiro ou falso.' });
        break;
      }
    }
    return problems;
  }
}
