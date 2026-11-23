import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { RawDirectoryEntry } from '../types/collaborator.js';
import { DirectorySource } from './directory-source.interface.js';
import { SnapshotDirectorySource } from './snapshot-directory.source.js';

const run = promisify(execFile);

/**
 * Lê o AD ao vivo com o login do Windows de quem roda a API (sem senha guardada), chamando
 * scripts/exportar-ad.ps1. Só para a máquina de desenvolvimento no domínio; no servidor use LDAP.
 */
export class WindowsLoginDirectorySource implements DirectorySource {
  readonly kind = 'WINDOWS_LOGIN' as const;

  constructor(
    private readonly scriptPath: string,
    private readonly server: string,
  ) {}

  async fetchEntries(): Promise<RawDirectoryEntry[]> {
    if (process.platform !== 'win32') throw new Error('DIRECTORY_SOURCE=windows só funciona no Windows (máquina no domínio).');
    const folder = await mkdtemp(join(tmpdir(), 'assinaturas-ad-'));
    const out = join(folder, 'ad.json');
    try {
      await run(
        'powershell.exe',
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', this.scriptPath, '-Server', this.server, '-Out', out],
        {
          timeout: 120_000,
          windowsHide: true,
        },
      );
      return await new SnapshotDirectorySource(out).fetchEntries();
    } finally {
      await rm(folder, { recursive: true, force: true });
    }
  }
}
