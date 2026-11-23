import { RawDirectoryEntry } from '../types/collaborator.js';

export type DirectorySourceKind = 'SNAPSHOT' | 'LDAP' | 'WINDOWS_LOGIN';

/** De onde vêm as contas: LDAP no servidor, arquivo exportado no modo local. */
export interface DirectorySource {
  readonly kind: DirectorySourceKind;
  /** Devolve só contas ativas (não desativadas), com os atributos pedidos. */
  fetchEntries(attributes: string[]): Promise<RawDirectoryEntry[]>;
}

export const DIRECTORY_SOURCE = Symbol('DIRECTORY_SOURCE');

/** Atributos sempre lidos, além dos mapeados nas configurações. */
export const BASE_ATTRIBUTES = ['objectGUID', 'sAMAccountName', 'distinguishedName', 'whenCreated', 'whenChanged'];
