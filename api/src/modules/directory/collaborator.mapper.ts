import { TextHelper } from '../../common/helpers/text.helper.js';
import { SettingKeyEnum } from '../settings/types/setting-key.enum.js';
import { SettingsValues } from '../settings/types/settings-values.js';
import { CollaboratorLevelEnum } from './types/collaborator-level.enum.js';
import { Collaborator, RawDirectoryEntry } from './types/collaborator.js';

export type MapperSettings = Pick<
  SettingsValues,
  SettingKeyEnum.FIELD_SOURCES | SettingKeyEnum.LEVEL_SYNONYMS | SettingKeyEnum.VALUE_ALIASES | SettingKeyEnum.DIRECTORY_FILTERS
>;

/** Traduz a conta do AD para o colaborador que as regras enxergam. Funções puras (testáveis sem banco). */
export class CollaboratorMapper {
  /** Devolve null quando a conta fica de fora (OU de serviço, sem e-mail etc.). */
  static toCollaborator(raw: RawDirectoryEntry, settings: MapperSettings, informedMobile = ''): Collaborator | null {
    const sources = settings[SettingKeyEnum.FIELD_SOURCES];
    const filters = settings[SettingKeyEnum.DIRECTORY_FILTERS];
    const read = (attribute: string) => String(raw[attribute] ?? '').trim();

    const dn = read('distinguishedName');
    const email = read(sources.email);
    const excluded = filters.excludedOuKeywords.some((k) => k.trim() && TextHelper.normalize(dn).includes(TextHelper.normalize(k)));
    if (excluded || (filters.requireEmail && !email)) return null;

    const department = read(sources.department);
    const { area, team } = CollaboratorMapper.splitDepartment(department, settings[SettingKeyEnum.VALUE_ALIASES]);
    const title = read(sources.title);

    return {
      id: read('objectGUID') || read('sAMAccountName'),
      login: read('sAMAccountName'),
      name: read(sources.name) || read('sAMAccountName'),
      email,
      title,
      department,
      area,
      team,
      level: CollaboratorMapper.levelFromTitle(title, settings[SettingKeyEnum.LEVEL_SYNONYMS]),
      company: read(sources.company),
      segment: read(sources.segment),
      corporateMobile: read(sources.corporateMobile),
      extension: read(sources.extension),
      informedMobile,
      state: read(sources.state),
      office: read(sources.office),
      createdAt: read('whenCreated') || null,
      changedAt: read('whenChanged') || null,
    };
  }

  /**
   * Departamento do AD no formato "Grupo <Área> - <Time>". O separador é o primeiro hífen com espaço de
   * pelo menos um lado, para "Ti-Help Desk - Ti" virar área "Ti-Help Desk" e time "Ti".
   */
  static splitDepartment(department: string, aliases: SettingsValues[SettingKeyEnum.VALUE_ALIASES]): { area: string; team: string } {
    const withoutPrefix = department.replace(/^grupo\s+/i, '').trim();
    const match = /\s+-\s*|\s*-\s+/.exec(withoutPrefix);
    const area = match ? withoutPrefix.slice(0, match.index).trim() : withoutPrefix;
    const team = match ? withoutPrefix.slice(match.index + match[0].length).trim() : '';
    const alias = (field: 'area' | 'team', value: string) =>
      aliases.find((a) => a.field === field && TextHelper.normalize(a.from) === TextHelper.normalize(value))?.to ?? value;
    return { area: alias('area', area), team: alias('team', team) };
  }

  /** Nível pela primeira palavra do cargo ("Aux de Reparador" → AUXILIARY). Sem sinônimo → MEMBER. */
  static levelFromTitle(title: string, synonyms: SettingsValues[SettingKeyEnum.LEVEL_SYNONYMS]): CollaboratorLevelEnum {
    const firstWord = TextHelper.normalize(title).split(/[\s/,]+|-(?=\S)/)[0] ?? '';
    if (!firstWord) return CollaboratorLevelEnum.MEMBER;
    const found = synonyms.find((s) => s.words.some((w) => TextHelper.normalize(w) === firstWord));
    return found?.level ?? CollaboratorLevelEnum.MEMBER;
  }
}
