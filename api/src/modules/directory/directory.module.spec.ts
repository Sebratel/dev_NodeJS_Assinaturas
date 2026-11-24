import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { buildDirectorySource } from './directory.module.js';
import { LdapDirectorySource } from './sources/ldap-directory.source.js';
import { UnconfiguredDirectorySource } from './sources/unconfigured-directory.source.js';

const config = (env: Record<string, string>) => new ConfigService(env);
const LDAP = { DIRECTORY_SOURCE: 'ldap', AD_URL: 'ldap://10.0.11.251', AD_BASE_DN: 'DC=corp,DC=sebratel,DC=com,DC=br' };

describe('buildDirectorySource', () => {
  it('sem a conta do AD, a API sobe e toda leitura falha com o motivo', async () => {
    const source = buildDirectorySource(config({ ...LDAP, AD_BIND_USER: '', AD_BIND_PASSWORD: '' }));

    expect(source).toBeInstanceOf(UnconfiguredDirectorySource);
    expect(source.kind).toBe('LDAP');
    await expect(source.fetchEntries(['mail'])).rejects.toThrow('AD não configurado: preencha AD_BIND_USER, AD_BIND_PASSWORD');
  });

  it('com a conta do AD, lê por LDAP', () => {
    const source = buildDirectorySource(config({ ...LDAP, AD_BIND_USER: 'leitura@sebratel', AD_BIND_PASSWORD: 'x' }));

    expect(source).toBeInstanceOf(LdapDirectorySource);
  });

  it('origem desconhecida continua barrando a subida', () => {
    expect(() => buildDirectorySource(config({ DIRECTORY_SOURCE: 'csv' }))).toThrow('DIRECTORY_SOURCE inválido');
  });
});
