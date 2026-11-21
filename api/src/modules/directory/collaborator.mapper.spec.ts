import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../settings/default-settings.js';
import { CollaboratorMapper } from './collaborator.mapper.js';
import { CollaboratorLevelEnum } from './types/collaborator-level.enum.js';

const settings = DEFAULT_SETTINGS;
const aliases = settings['value-aliases'];
const synonyms = settings['level-synonyms'];

describe('CollaboratorMapper', () => {
  it.each([
    ['Grupo Técnica - Suporte Técnico', 'Técnica', 'Suporte Técnico'],
    ['Grupo Técnica - Suporte Tecnico', 'Técnica', 'Suporte Técnico'],
    ['Grupo Técnica - Infra Implan - Lançamento', 'Técnica', 'Infra Implan - Lançamento'],
    ['Grupo Ti-Help Desk - Ti', 'Ti-Help Desk', 'Ti'],
    ['Grupo Administrativo- Diretoria', 'Administrativo', 'Diretoria'],
    ['Grupo Terceiros', 'Terceiros', ''],
  ])('separa "%s" em área "%s" e time "%s"', (department, area, team) => {
    expect(CollaboratorMapper.splitDepartment(department, aliases)).toEqual({ area, team });
  });

  it.each([
    ['Aux de Reparador de Linhas de Telecom', CollaboratorLevelEnum.AUXILIARY],
    ['Supervisor(a) de Vendas', CollaboratorLevelEnum.SUPERVISOR],
    ['Diretora Comercial', CollaboratorLevelEnum.DIRECTOR],
    ['Instalador-Reparador de Redes', CollaboratorLevelEnum.MEMBER],
    ['Líder de Vendas Externo JR', CollaboratorLevelEnum.LEADER],
    ['', CollaboratorLevelEnum.MEMBER],
  ])('cargo "%s" vira nível %s', (title, level) => {
    expect(CollaboratorMapper.levelFromTitle(title, synonyms)).toBe(level);
  });

  it('deixa de fora conta em OU de serviço e conta sem e-mail', () => {
    const base = { objectGUID: 'g1', sAMAccountName: 'x', displayName: 'X', mail: 'x@sebratel.com.br', department: 'Grupo Ti - Dev' };
    expect(CollaboratorMapper.toCollaborator({ ...base, distinguishedName: 'CN=X,OU=Grupo Conta de Serviço,DC=corp' }, settings)).toBeNull();
    expect(CollaboratorMapper.toCollaborator({ ...base, mail: '', distinguishedName: 'CN=X,OU=Grupo Ti - Dev,DC=corp' }, settings)).toBeNull();
    expect(CollaboratorMapper.toCollaborator({ ...base, distinguishedName: 'CN=X,OU=Grupo Ti - Dev,DC=corp' }, settings)?.team).toBe('Dev');
  });
});
