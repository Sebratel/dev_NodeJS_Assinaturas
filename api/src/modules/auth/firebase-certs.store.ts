import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
/** Depois disso a cópia ainda vale, mas a renovação começa em segundo plano. */
const SOFT_TTL_MS = 6 * 60 * 60 * 1000;
/** Depois disso a requisição espera a renovação (se falhar, a cópia antiga continua valendo). */
const HARD_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10_000;

export type CertificateMap = Record<string, string>;

interface CachedCertificates {
  keys: CertificateMap;
  fetchedAt: number;
}

/**
 * Certificados públicos do Google que assinam os ID tokens do Firebase (padrao-login-sso).
 * Ficam em memória e numa cópia em disco: um restart com o Google bloqueado continua validando login.
 * Renovação que falha nunca apaga o que já existe.
 */
@Injectable()
export class FirebaseCertsStore {
  private readonly logger = new Logger(FirebaseCertsStore.name);
  private readonly cachePath: string;
  private cached: CachedCertificates | null = null;
  private loadedFromDisk = false;
  private inFlight: Promise<CachedCertificates> | null = null;

  constructor(configService: ConfigService) {
    this.cachePath = resolve(configService.get<string>('FIREBASE_CERTS_CACHE_PATH') ?? '../data/firebase-certs.json');
  }

  async getKeys(): Promise<CertificateMap> {
    this.loadDiskCopyOnce();
    const age = this.cached ? Date.now() - this.cached.fetchedAt : Number.POSITIVE_INFINITY;
    if (this.cached && age < SOFT_TTL_MS) return this.cached.keys;
    if (this.cached && age < HARD_TTL_MS) {
      this.refresh().catch(() => undefined);
      return this.cached.keys;
    }
    return (await this.refresh()).keys;
  }

  /** Token com `kid` que não está na cópia: o Google pode ter girado a chave. Renova se a cópia tiver mais de `minAgeMs`. */
  async refreshIfOlderThan(minAgeMs: number): Promise<CertificateMap> {
    if (this.cached && Date.now() - this.cached.fetchedAt < minAgeMs) return this.cached.keys;
    return (await this.refresh()).keys;
  }

  /** Uma renovação por vez. Falha com cópia existente devolve a cópia; sem cópia, propaga o erro. */
  private refresh(): Promise<CachedCertificates> {
    this.inFlight ??= this.fetchCertificates()
      .then((keys) => {
        this.cached = { keys, fetchedAt: Date.now() };
        this.saveDiskCopy(this.cached);
        return this.cached;
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        if (this.cached) {
          this.logger.warn({ msg: 'firebase certificates refresh failed, keeping cached copy', error: message });
          return this.cached;
        }
        this.logger.error({ msg: 'firebase certificates unavailable', error: message });
        throw error;
      })
      .finally(() => {
        this.inFlight = null;
      });
    return this.inFlight;
  }

  /** Busca no Google. Separado para os testes trocarem a rede por um stub. */
  protected async fetchCertificates(): Promise<CertificateMap> {
    const response = await fetch(CERTS_URL, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!response.ok) throw new Error(`Google respondeu HTTP ${response.status} aos certificados`);
    const body: unknown = await response.json();
    if (!FirebaseCertsStore.isCertificateMap(body)) throw new Error('resposta de certificados em formato inesperado');
    return body;
  }

  private loadDiskCopyOnce(): void {
    if (this.loadedFromDisk || this.cached) return;
    this.loadedFromDisk = true;
    try {
      const parsed = JSON.parse(readFileSync(this.cachePath, 'utf8')) as Partial<CachedCertificates>;
      if (typeof parsed.fetchedAt === 'number' && FirebaseCertsStore.isCertificateMap(parsed.keys)) {
        this.cached = { keys: parsed.keys, fetchedAt: parsed.fetchedAt };
      }
    } catch {
      // Sem cópia em disco (primeira subida) ou arquivo ilegível: a primeira validação busca no Google.
    }
  }

  private saveDiskCopy(cached: CachedCertificates): void {
    try {
      mkdirSync(dirname(this.cachePath), { recursive: true });
      writeFileSync(this.cachePath, JSON.stringify(cached), 'utf8');
    } catch (error) {
      this.logger.warn({ msg: 'firebase certificates disk copy failed', error: error instanceof Error ? error.message : String(error) });
    }
  }

  private static isCertificateMap(value: unknown): value is CertificateMap {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const entries = Object.entries(value);
    return entries.length > 0 && entries.every(([, pem]) => typeof pem === 'string' && pem.length > 0);
  }
}
