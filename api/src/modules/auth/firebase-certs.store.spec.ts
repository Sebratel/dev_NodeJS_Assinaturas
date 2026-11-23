import type { ConfigService } from '@nestjs/config';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { type CertificateMap, FirebaseCertsStore } from './firebase-certs.store.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Troca a rede por uma fila de respostas: CertificateMap = sucesso, Error = falha. */
class StubbedStore extends FirebaseCertsStore {
  calls = 0;
  constructor(
    cachePath: string,
    private readonly responses: Array<CertificateMap | Error>,
  ) {
    super({ get: () => cachePath } as unknown as ConfigService);
  }

  protected override async fetchCertificates(): Promise<CertificateMap> {
    const next = this.responses[Math.min(this.calls++, this.responses.length - 1)];
    if (next instanceof Error) throw next;
    return next;
  }
}

const tempCachePath = () => join(mkdtempSync(join(tmpdir(), 'firebase-certs-')), 'firebase-certs.json');
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('FirebaseCertsStore', () => {
  it('busca no Google na primeira vez e grava a cópia em disco', async () => {
    const path = tempCachePath();
    const store = new StubbedStore(path, [{ a: 'cert-a' }]);
    expect(await store.getKeys()).toEqual({ a: 'cert-a' });
    expect(JSON.parse(readFileSync(path, 'utf8')).keys).toEqual({ a: 'cert-a' });
  });

  it('com a rede bloqueada, usa a cópia em disco de uma subida anterior', async () => {
    const path = tempCachePath();
    writeFileSync(path, JSON.stringify({ keys: { a: 'cert-do-disco' }, fetchedAt: Date.now() - 2 * DAY_MS }));
    const store = new StubbedStore(path, [new Error('rede bloqueada')]);
    expect(await store.getKeys()).toEqual({ a: 'cert-do-disco' });
    await flush();
    // A renovação em segundo plano falhou, mas a cópia continua valendo.
    expect(await store.getKeys()).toEqual({ a: 'cert-do-disco' });
  });

  it('cópia mais velha que 30 dias: espera a renovação e, se ela falhar, mantém a cópia', async () => {
    const path = tempCachePath();
    writeFileSync(path, JSON.stringify({ keys: { a: 'cert-antigo' }, fetchedAt: Date.now() - 40 * DAY_MS }));
    const store = new StubbedStore(path, [new Error('rede bloqueada')]);
    expect(await store.getKeys()).toEqual({ a: 'cert-antigo' });
    expect(store.calls).toBe(1);
  });

  it('sem cópia e sem rede, falha (o serviço responde 503)', async () => {
    const store = new StubbedStore(tempCachePath(), [new Error('rede bloqueada')]);
    await expect(store.getKeys()).rejects.toThrow('rede bloqueada');
  });

  it('kid desconhecido só renova se a cópia tiver mais que o intervalo mínimo', async () => {
    const store = new StubbedStore(tempCachePath(), [{ a: 'cert-a' }, { a: 'cert-a', b: 'cert-b' }]);
    await store.getKeys();
    expect(await store.refreshIfOlderThan(60_000)).toEqual({ a: 'cert-a' });
    expect(await store.refreshIfOlderThan(0)).toEqual({ a: 'cert-a', b: 'cert-b' });
    expect(store.calls).toBe(2);
  });
});
