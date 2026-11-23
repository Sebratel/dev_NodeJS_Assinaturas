import type { ConfigService } from '@nestjs/config';

export interface AuthSettings {
  /** false só em desenvolvimento local: toda requisição vira o usuário "local". */
  enabled: boolean;
  /** Projeto Firebase deste sistema (padrão: authentication-assinaturas). */
  projectId: string;
  /** Domínio aceito no e-mail do token. */
  allowedDomain: string;
  /** Quem pode usar o sistema. Vazio = ninguém (padrão seguro). */
  adminEmails: ReadonlySet<string>;
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null || String(value).trim() === '') return fallback;
  return !['false', '0', 'no', 'off', 'nao', 'não'].includes(String(value).trim().toLowerCase());
}

export function readAuthSettings(config: ConfigService): AuthSettings {
  const enabled = parseBoolean(config.get('AUTH_ENABLED'), true);
  const projectId = String(config.get('FIREBASE_PROJECT_ID') ?? '').trim();
  if (enabled && !projectId) {
    throw new Error('AUTH_ENABLED=true exige FIREBASE_PROJECT_ID (projeto Firebase do sistema, ex.: authentication-assinaturas).');
  }
  const adminEmails = String(config.get('AUTH_ADMIN_EMAILS') ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return {
    enabled,
    projectId,
    allowedDomain: String(config.get('AUTH_ALLOWED_DOMAIN') ?? 'sebratel.com.br')
      .trim()
      .toLowerCase()
      .replace(/^@/, ''),
    adminEmails: new Set(adminEmails),
  };
}
