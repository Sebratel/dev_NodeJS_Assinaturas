import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JWT } from 'google-auth-library';
import { existsSync, readFileSync } from 'node:fs';
import { BusinessException } from '../../common/exceptions/business.exception.js';

export const GMAIL_SETTINGS_SCOPE = 'https://www.googleapis.com/auth/gmail.settings.basic';
export const DIRECTORY_USER_SCOPE = 'https://www.googleapis.com/auth/admin.directory.user';

interface ServiceAccountKey {
  client_email: string;
  client_id: string;
  private_key: string;
  project_id: string;
}

export type DelegationStatus = 'NOT_CONFIGURED' | 'AUTHORIZED' | 'NOT_AUTHORIZED';

/**
 * Conta de serviço com delegação em todo o domínio. Cada chamada "age como" um usuário (subject).
 * A chave é lida do arquivo em GOOGLE_SERVICE_ACCOUNT_KEY_FILE (fora do repositório) e nunca vai para log ou resposta.
 */
@Injectable()
export class GoogleCredentialsService {
  private readonly logger = new Logger(GoogleCredentialsService.name);
  private key: ServiceAccountKey | null = null;
  private delegationCheck: { at: number; status: DelegationStatus; error: string | null } | null = null;

  constructor(private readonly configService: ConfigService) {}

  keyFilePath(): string {
    return this.configService.get<string>('GOOGLE_SERVICE_ACCOUNT_KEY_FILE') ?? '';
  }

  isConfigured(): boolean {
    const path = this.keyFilePath();
    return Boolean(path) && existsSync(path);
  }

  clientFor(subject: string, scope: string): JWT {
    const key = this.loadKey();
    return new JWT({ email: key.client_email, key: key.private_key, scopes: [scope], subject });
  }

  clientId(): string | null {
    return this.isConfigured() ? this.loadKey().client_id : (this.configService.get<string>('GOOGLE_SERVICE_ACCOUNT_CLIENT_ID') ?? null);
  }

  /** Pede um token "como" o usuário de teste. Confirma que o superadmin autorizou o escopo. Guarda o resultado por 10 min. */
  async checkDelegation(force = false): Promise<{ status: DelegationStatus; error: string | null }> {
    if (!this.isConfigured()) return { status: 'NOT_CONFIGURED', error: null };
    if (!force && this.delegationCheck && Date.now() - this.delegationCheck.at < 600_000) return this.delegationCheck;
    const subject = this.testSubject();
    if (!subject) return { status: 'NOT_CONFIGURED', error: 'Defina GOOGLE_DELEGATION_TEST_USER (um e-mail do domínio).' };
    try {
      await this.clientFor(subject, GMAIL_SETTINGS_SCOPE).authorize();
      this.delegationCheck = { at: Date.now(), status: 'AUTHORIZED', error: null };
    } catch (error) {
      const message = GoogleCredentialsService.errorMessage(error);
      this.logger.warn(`Delegação recusada: ${message}`);
      this.delegationCheck = { at: Date.now(), status: 'NOT_AUTHORIZED', error: message };
    }
    return this.delegationCheck;
  }

  testSubject(): string {
    return this.configService.get<string>('GOOGLE_DELEGATION_TEST_USER') ?? '';
  }

  static errorMessage(error: unknown): string {
    const data = (error as { response?: { data?: { error_description?: string; error?: { message?: string } | string } } })?.response?.data;
    if (data?.error_description) return data.error_description;
    if (typeof data?.error === 'object' && data.error?.message) return data.error.message;
    if (typeof data?.error === 'string') return data.error;
    return error instanceof Error ? error.message : String(error);
  }

  private loadKey(): ServiceAccountKey {
    if (this.key) return this.key;
    if (!this.isConfigured()) {
      throw new BusinessException(
        'GOOGLE_NOT_CONFIGURED',
        'Chave da conta de serviço não configurada (GOOGLE_SERVICE_ACCOUNT_KEY_FILE).',
        HttpStatus.CONFLICT,
      );
    }
    const parsed = JSON.parse(readFileSync(this.keyFilePath(), 'utf8')) as ServiceAccountKey;
    if (!parsed.client_email || !parsed.private_key) {
      throw new BusinessException('GOOGLE_KEY_INVALID', 'O arquivo da chave não é de uma conta de serviço.', HttpStatus.CONFLICT);
    }
    this.key = parsed;
    return parsed;
  }
}
