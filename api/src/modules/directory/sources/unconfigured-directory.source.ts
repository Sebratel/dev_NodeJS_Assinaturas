import { RawDirectoryEntry } from '../types/collaborator.js';
import { DirectorySource } from './directory-source.interface.js';

/**
 * LDAP sem a conta de leitura (AD_BIND_*): a API sobe mesmo assim, para regras, modelos e frases poderem ser
 * preparados antes de a conta existir. Toda leitura falha com o motivo, que aparece no Monitoramento e no
 * `directory.ok` do /api/health. Falhar (e não devolver lista vazia) é de propósito: o DirectoryService mantém a
 * última leitura boa e não dispara a gravação automática quando a leitura falha.
 */
export class UnconfiguredDirectorySource implements DirectorySource {
  readonly kind = 'LDAP' as const;

  constructor(private readonly missing: string[]) {}

  fetchEntries(_attributes: string[]): Promise<RawDirectoryEntry[]> {
    return Promise.reject(new Error(this.reason()));
  }

  reason(): string {
    return `AD não configurado: preencha ${this.missing.join(', ')} no Environment da stack (conta só de leitura).`;
  }
}
