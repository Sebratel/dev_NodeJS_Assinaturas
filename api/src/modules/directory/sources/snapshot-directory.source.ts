import { readFile } from 'node:fs/promises';
import { RawDirectoryEntry } from '../types/collaborator.js';
import { DirectorySource } from './directory-source.interface.js';

/** Lê o arquivo gerado por scripts/exportar-ad.ps1 (login do Windows, sem senha). Só para desenvolvimento local. */
export class SnapshotDirectorySource implements DirectorySource {
  readonly kind = 'SNAPSHOT' as const;

  constructor(private readonly filePath: string) {}

  async fetchEntries(): Promise<RawDirectoryEntry[]> {
    const text = await readFile(this.filePath, 'utf8');
    const parsed: unknown = JSON.parse(text.replace(/^﻿/, ''));
    if (!Array.isArray(parsed)) throw new Error(`Snapshot do AD inválido em ${this.filePath}: esperado um array.`);
    return parsed as RawDirectoryEntry[];
  }
}
