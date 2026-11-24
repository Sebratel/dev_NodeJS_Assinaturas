import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { type AuthSettings, readAuthSettings } from './auth-settings.js';
import { type CertificateMap, FirebaseCertsStore } from './firebase-certs.store.js';
import { type FirebaseIdTokenClaims, TokenRejectedError, verifyFirebaseIdToken } from './firebase-token.verifier.js';
import { UserRoleEnum } from '../users/types/user-role.enum.js';
import { UsersService } from '../users/users.service.js';
import { HubSsoService } from './hub-sso.service.js';

export interface AuthUser {
  email: string;
  name: string;
  role: UserRoleEnum;
}

/** Usuário de todas as requisições quando AUTH_ENABLED=false (só desenvolvimento local). */
export const LOCAL_USER: AuthUser = { email: 'local', name: 'Modo local', role: UserRoleEnum.MASTER };

/** Com `kid` desconhecido, renova os certificados no máximo uma vez por minuto. */
const UNKNOWN_KEY_REFRESH_MS = 60_000;

/**
 * Login SSO (padrao-login-sso): o frontend manda o ID token do Firebase em `Authorization: Bearer`,
 * a API confere a assinatura localmente e o domínio do e-mail; o perfil vem do AUTH_ADMIN_EMAILS (master fixo)
 * ou da tela Usuários (tabela users); o resto do domínio entra como Visualizador.
 * 401 = sem login ou login inválido (o frontend renova o token e tenta de novo); 403 = logado, mas sem acesso.
 */
@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  readonly settings: AuthSettings;

  constructor(
    configService: ConfigService,
    private readonly certs: FirebaseCertsStore,
    private readonly usersService: UsersService,
    private readonly hubSso: HubSsoService,
  ) {
    this.settings = readAuthSettings(configService);
  }

  onModuleInit(): void {
    if (!this.settings.enabled) {
      this.logger.warn({ msg: 'auth disabled: every request runs as the local user (AUTH_ENABLED=false)' });
      return;
    }
    this.logger.log({
      msg: 'auth enabled',
      firebaseProjectId: this.settings.projectId,
      allowedDomain: this.settings.allowedDomain,
      adminCount: this.settings.adminEmails.size,
    });
    if (!this.settings.adminEmails.size) {
      this.logger.warn({
        msg: 'AUTH_ADMIN_EMAILS is empty: no fixed master, only users already registered in the users table can sign in',
      });
    }
    // Aquece o cache para a primeira requisição não esperar o Google. Falha aqui só vira log.
    this.certs.getKeys().catch(() => undefined);
  }

  async authenticate(authorization: string | undefined): Promise<AuthUser> {
    if (!this.settings.enabled) return LOCAL_USER;

    const match = /^Bearer\s+(\S+)\s*$/i.exec(authorization ?? '');
    if (!match) throw new BusinessException('AUTH_REQUIRED', 'Faça login para continuar.', HttpStatus.UNAUTHORIZED);

    // Sessão da entrada pelo Hub (emitida por esta API) vem primeiro. O perfil é lido de novo a cada pedido.
    const hub = this.hubSso.verifySession(match[1]);
    if (hub) return this.withRole(hub.email, hub.name);

    const claims = await this.verify(match[1]);
    if (!claims.emailVerified) return this.forbid(claims.email, 'EMAIL_NOT_VERIFIED', 'O e-mail desta conta Google não está verificado.');
    if (!claims.email.endsWith(`@${this.settings.allowedDomain}`)) {
      return this.forbid(claims.email, 'DOMAIN', `Entre com a sua conta @${this.settings.allowedDomain}.`);
    }
    const user = await this.withRole(claims.email, claims.name || claims.email.split('@')[0]);
    // HUB_ONLY: login direto (Google na própria página) só para master, a porta de emergência se o Hub cair.
    if (this.hubSso.isHubOnly() && user.role !== UserRoleEnum.MASTER) {
      this.logger.warn({ msg: 'auth forbidden', reason: 'HUB_ONLY', userEmail: user.email });
      throw new BusinessException('HUB_ONLY', 'O acesso a este sistema é pelo Hub Apps.', HttpStatus.FORBIDDEN);
    }
    return user;
  }

  /** Perfil de quem entrou: master da stack, tela Usuários ou Visualizador (resto do domínio). Fora do domínio = 403. */
  async withRole(email: string, name: string): Promise<AuthUser> {
    const role = await this.usersService.findRole(email);
    if (!role) {
      return this.forbid(email, 'DOMAIN', `Entre com a sua conta @${this.settings.allowedDomain}.`);
    }
    return { email: email.toLowerCase(), name, role };
  }

  private async verify(token: string): Promise<FirebaseIdTokenClaims> {
    let keys = await this.loadKeys(() => this.certs.getKeys());
    try {
      try {
        return verifyFirebaseIdToken(token, { projectId: this.settings.projectId, keys });
      } catch (error) {
        if (!(error instanceof TokenRejectedError) || error.reason !== 'UNKNOWN_KEY') throw error;
        keys = await this.loadKeys(() => this.certs.refreshIfOlderThan(UNKNOWN_KEY_REFRESH_MS));
        return verifyFirebaseIdToken(token, { projectId: this.settings.projectId, keys });
      }
    } catch (error) {
      if (!(error instanceof TokenRejectedError)) throw error;
      this.logger.warn({ msg: 'auth rejected', reason: error.reason });
      if (error.reason === 'EXPIRED')
        throw new BusinessException('AUTH_TOKEN_EXPIRED', 'Sua sessão expirou. Entre de novo.', HttpStatus.UNAUTHORIZED);
      throw new BusinessException('AUTH_TOKEN_INVALID', 'Login inválido. Entre de novo.', HttpStatus.UNAUTHORIZED);
    }
  }

  private async loadKeys(load: () => Promise<CertificateMap>): Promise<CertificateMap> {
    try {
      return await load();
    } catch {
      throw new BusinessException(
        'AUTH_UNAVAILABLE',
        'Não foi possível validar o login agora (certificados do Google indisponíveis). Tente de novo em instantes.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private forbid(email: string, reason: string, message: string): never {
    this.logger.warn({ msg: 'auth forbidden', reason, userEmail: email });
    throw new BusinessException('AUTH_FORBIDDEN', message, HttpStatus.FORBIDDEN);
  }
}
