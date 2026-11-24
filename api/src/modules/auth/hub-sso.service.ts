import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { BusinessException } from '../../common/exceptions/business.exception.js';

/** Quem o Hub mandou, depois de conferido. O perfil NÃO vem do Hub: vem da tela Usuários. */
export interface HubIdentity {
  email: string;
  name: string;
}

const SESSION_SECONDS = 8 * 3600;
/** Tolerância de relógio entre o hub-api e esta API. */
const CLOCK_SKEW_SECONDS = 300;
const SESSION_ISSUER = 'assinaturas';
const SESSION_AUDIENCE = 'hub-session';

const now = () => Math.floor(Date.now() / 1000);
const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
const decode = (part: string): Record<string, unknown> => JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));

/** Confere forma, algoritmo (só HS256, nunca o que o token declara) e assinatura. Devolve o payload ou null. */
function verifyHs256(token: unknown, key: string | Buffer): Record<string, unknown> | null {
  const [header, payload, signature, extra] = String(token ?? '').split('.');
  if (!header || !payload || !signature || extra !== undefined) return null;
  try {
    if (decode(header).alg !== 'HS256') return null;
    const expected = createHmac('sha256', key).update(`${header}.${payload}`).digest();
    const received = Buffer.from(signature, 'base64url');
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
    return decode(payload);
  } catch {
    return null;
  }
}

/**
 * Entrada pelo Hub Apps (guia "Apps embutidos no Hub", modelo do Data Hub):
 * o Hub abre o sistema num quadro com `?sso_token=` (JWT HS256 de 5 min, assinado com o SSO_JWT_SECRET do Hub),
 * a tela troca esse token por uma sessão própria de 8 h. HUB_ONLY fecha o login direto para quem não é master.
 */
@Injectable()
export class HubSsoService {
  private readonly logger = new Logger(HubSsoService.name);
  private readonly secret: string;
  private readonly appId: string;
  private readonly hubOnlyRequested: boolean;
  readonly hubUrl: string;
  private readonly allowedDomain: string;
  /** Uso único: hash do token → exp. Um contêiner só; depois de um restart o token já está perto de vencer. */
  private readonly usedTokens = new Map<string, number>();

  constructor(configService: ConfigService) {
    this.secret = String(configService.get('HUB_SSO_SECRET') ?? '').trim();
    this.appId = String(configService.get('HUB_APP_ID') ?? '').trim();
    this.hubOnlyRequested =
      String(configService.get('HUB_ONLY') ?? '')
        .trim()
        .toLowerCase() === 'true';
    this.hubUrl = String(configService.get('HUB_URL') ?? '').trim() || 'https://hub-apps.sebratel.net.br';
    this.allowedDomain = String(configService.get('AUTH_ALLOWED_DOMAIN') ?? 'sebratel.com.br')
      .trim()
      .toLowerCase()
      .replace(/^@/, '');
    if (this.hubOnlyRequested && !this.isConfigured()) {
      this.logger.warn({ msg: 'HUB_ONLY=true ignored: HUB_SSO_SECRET and HUB_APP_ID are required (it would lock everyone out)' });
    }
  }

  isConfigured(): boolean {
    return Boolean(this.secret && this.appId);
  }

  /** Só vale com a entrada pelo Hub configurada; sem ela, trancaria todo mundo do lado de fora. */
  isHubOnly(): boolean {
    return this.hubOnlyRequested && this.isConfigured();
  }

  /** Confere o token que o Hub pôs na URL. Erro sempre como BusinessException (a tela mostra a mensagem). */
  exchange(token: unknown): HubIdentity {
    if (!this.isConfigured()) {
      throw new BusinessException('HUB_NOT_CONFIGURED', 'Entrada pelo Hub não configurada neste sistema.', HttpStatus.SERVICE_UNAVAILABLE);
    }
    const payload = verifyHs256(token, this.secret);
    if (!payload) return this.reject('HUB_TOKEN_INVALID', 'Token do Hub inválido. Abra de novo pelo Hub.', HttpStatus.UNAUTHORIZED);
    const exp = Number(payload.exp);
    const iat = Number(payload.iat);
    if (!(exp > now())) {
      return this.reject('HUB_TOKEN_EXPIRED', 'O link de acesso venceu. Abra de novo pelo Hub.', HttpStatus.UNAUTHORIZED);
    }
    if (!Number.isFinite(iat) || iat > now() + CLOCK_SKEW_SECONDS) {
      return this.reject('HUB_TOKEN_INVALID', 'Token do Hub inválido. Abra de novo pelo Hub.', HttpStatus.UNAUTHORIZED);
    }
    // O segredo é o mesmo para todos os apps do Hub: sem isto, um token emitido para outro sistema entraria aqui.
    if (payload.appId !== this.appId) {
      return this.reject('HUB_TOKEN_OTHER_APP', 'Token emitido para outro aplicativo do Hub.', HttpStatus.FORBIDDEN);
    }
    const email = String(payload.email ?? '')
      .trim()
      .toLowerCase();
    if (!email.endsWith(`@${this.allowedDomain}`)) {
      return this.reject('HUB_DOMAIN', `Entre no Hub com a sua conta @${this.allowedDomain}.`, HttpStatus.FORBIDDEN);
    }
    for (const [hash, expiresAt] of this.usedTokens) if (expiresAt <= now()) this.usedTokens.delete(hash);
    const hash = createHash('sha256').update(String(token)).digest('hex');
    if (this.usedTokens.has(hash)) {
      return this.reject('HUB_TOKEN_USED', 'Este link de acesso já foi usado. Abra de novo pelo Hub.', HttpStatus.UNAUTHORIZED);
    }
    this.usedTokens.set(hash, exp);
    const name = String(payload.name ?? '').trim();
    return { email, name: name || email.split('@')[0] };
  }

  issueSession(identity: HubIdentity): { token: string; expiresAt: string } {
    const iat = now();
    const exp = iat + SESSION_SECONDS;
    const body = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
      iss: SESSION_ISSUER,
      aud: SESSION_AUDIENCE,
      email: identity.email,
      name: identity.name,
      iat,
      exp,
    })}`;
    const signature = createHmac('sha256', this.sessionKey()).update(body).digest('base64url');
    return { token: `${body}.${signature}`, expiresAt: new Date(exp * 1000).toISOString() };
  }

  /** Sessão emitida por esta API? Qualquer outro token (Firebase, token cru do Hub) devolve null. */
  verifySession(token: string): HubIdentity | null {
    if (!this.isConfigured()) return null;
    const payload = verifyHs256(token, this.sessionKey());
    if (!payload || payload.iss !== SESSION_ISSUER || payload.aud !== SESSION_AUDIENCE || !(Number(payload.exp) > now())) return null;
    const email = String(payload.email ?? '').toLowerCase();
    if (!email) return null;
    return { email, name: String(payload.name ?? email) };
  }

  /**
   * Chave DERIVADA do segredo do Hub: o token do Hub não vale como sessão e a sessão não vale como token do Hub
   * (nem neste, nem em outro sistema que use o mesmo segredo).
   */
  private sessionKey(): Buffer {
    return createHmac('sha256', this.secret).update('assinaturas-hub-session-v1').digest();
  }

  private reject(code: string, message: string, status: HttpStatus): never {
    this.logger.warn({ msg: 'hub token rejected', reason: code });
    throw new BusinessException(code, message, status);
  }
}
