import { Client } from 'ldapts';
import { RawDirectoryEntry } from '../types/collaborator.js';
import { DirectorySource } from './directory-source.interface.js';

export interface LdapConnectionOptions {
  url: string;
  bindUser: string;
  bindPassword: string;
  baseDn: string;
}

/** Pessoas com conta ativa (bit 2 de userAccountControl = desativada). */
const ACTIVE_PEOPLE_FILTER = '(&(objectCategory=person)(objectClass=user)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))';

/** Leitura do AD por LDAP. Só faz bind e search: o sistema nunca escreve no AD. */
export class LdapDirectorySource implements DirectorySource {
  readonly kind = 'LDAP' as const;

  constructor(private readonly options: LdapConnectionOptions) {}

  async fetchEntries(attributes: string[]): Promise<RawDirectoryEntry[]> {
    const client = new Client({ url: this.options.url, timeout: 30_000, connectTimeout: 10_000 });
    try {
      await client.bind(this.options.bindUser, this.options.bindPassword);
      const { searchEntries } = await client.search(this.options.baseDn, {
        scope: 'sub',
        filter: ACTIVE_PEOPLE_FILTER,
        attributes,
        paged: { pageSize: 500 },
        explicitBufferAttributes: ['objectGUID'],
      });
      return searchEntries.map((entry) => this.toRawEntry(entry as Record<string, unknown>, attributes));
    } finally {
      await client.unbind().catch(() => undefined);
    }
  }

  private toRawEntry(entry: Record<string, unknown>, attributes: string[]): RawDirectoryEntry {
    const raw: RawDirectoryEntry = { distinguishedName: String(entry.dn ?? '') };
    const byLowerName = new Map(Object.keys(entry).map((key) => [key.toLowerCase(), key]));
    for (const attribute of attributes) {
      const key = byLowerName.get(attribute.toLowerCase());
      const value = key ? entry[key] : undefined;
      const first = Array.isArray(value) ? value[0] : value;
      if (first === undefined || first === null || first === '') {
        raw[attribute] = raw[attribute] ?? null;
      } else if (attribute === 'objectGUID' && Buffer.isBuffer(first)) {
        raw[attribute] = LdapDirectorySource.guidToString(first);
      } else if (/^when(Created|Changed)$/.test(attribute)) {
        raw[attribute] = LdapDirectorySource.generalizedTimeToIso(String(first));
      } else {
        raw[attribute] = Buffer.isBuffer(first) ? first.toString('utf8') : String(first);
      }
    }
    return raw;
  }

  /** objectGUID vem em bytes; os 3 primeiros blocos são little-endian. */
  static guidToString(bytes: Buffer): string {
    const hex = (start: number, end: number, reverse: boolean) => {
      const part = Array.from(bytes.subarray(start, end));
      return (reverse ? part.reverse() : part).map((b) => b.toString(16).padStart(2, '0')).join('');
    };
    return [hex(0, 4, true), hex(4, 6, true), hex(6, 8, true), hex(8, 10, false), hex(10, 16, false)].join('-');
  }

  /** "20261120123456.0Z" → "2026-11-20T12:34:56Z". */
  static generalizedTimeToIso(value: string): string | null {
    const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/.exec(value);
    return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z` : null;
  }
}
