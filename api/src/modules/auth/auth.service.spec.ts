import { HttpStatus, Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { createHmac, createSign, generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { AuthService, LOCAL_USER } from './auth.service.js';
import type { CertificateMap, FirebaseCertsStore } from './firebase-certs.store.js';
import { HubSsoService } from './hub-sso.service.js';
import type { Repository } from 'typeorm';
import type { UserEntity } from '../users/entities/user.entity.js';
import { UserRoleEnum } from '../users/types/user-role.enum.js';
import { UsersService } from '../users/users.service.js';

// Os avisos de recusa são esperados aqui; sem isso poluem a saída do teste.
Logger.overrideLogger(false);

const PROJECT_ID = 'authentication-assinaturas';
const KID = 'chave-de-teste';
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const PUBLIC_PEM = publicKey.export({ type: 'spki', format: 'pem' }).toString();
const attacker = generateKeyPairSync('rsa', { modulusLength: 2048 });
const NOW = Math.floor(Date.now() / 1000);

const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

function claims(overrides: Record<string, unknown> = {}) {
  return {
    iss: `https://securetoken.google.com/${PROJECT_ID}`,
    aud: PROJECT_ID,
    sub: 'uid-1',
    iat: NOW - 60,
    exp: NOW + 3600,
    email: 'Misael.Cruz@sebratel.com.br',
    email_verified: true,
    name: 'Misael Cruz',
    ...overrides,
  };
}

function signRs256(payload: object, header: object = { alg: 'RS256', kid: KID, typ: 'JWT' }, key = privateKey): string {
  const unsigned = `${encode(header)}.${encode(payload)}`;
  return `${unsigned}.${createSign('RSA-SHA256').update(unsigned).sign(key).toString('base64url')}`;
}

/** Tabela users em memória: só o que o AuthService consulta (perfil por e-mail; removidos já não aparecem). */
function usersWith(config: ConfigService, registered: Record<string, UserRoleEnum> = {}): UsersService {
  const repository = {
    findOneBy: async ({ email }: { email: string }) => (registered[email] ? { email, role: registered[email] } : null),
  } as unknown as Repository<UserEntity>;
  return new UsersService(repository, config);
}

function buildService(
  env: Record<string, string> = {},
  keys: CertificateMap = { [KID]: PUBLIC_PEM },
  registered: Record<string, UserRoleEnum> = {},
): AuthService {
  const values: Record<string, string> = {
    AUTH_ENABLED: 'true',
    FIREBASE_PROJECT_ID: PROJECT_ID,
    AUTH_ALLOWED_DOMAIN: 'sebratel.com.br',
    AUTH_ADMIN_EMAILS: 'misael.cruz@sebratel.com.br, outra.pessoa@sebratel.com.br',
    ...env,
  };
  const config = { get: (key: string) => values[key] } as unknown as ConfigService;
  const certs = { getKeys: async () => keys, refreshIfOlderThan: async () => keys } as unknown as FirebaseCertsStore;
  return new AuthService(config, certs, usersWith(config, registered), new HubSsoService(config));
}

class ConfigServiceStub {
  constructor(private readonly values: Record<string, string>) {}
  get(key: string) {
    return this.values[key];
  }
}

async function rejection(promise: Promise<unknown>): Promise<{ status: number; code: string }> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof BusinessException) return { status: error.getStatus(), code: error.code };
    throw error;
  }
  throw new Error('o token deveria ter sido recusado');
}

const bearer = (token: string) => `Bearer ${token}`;
const INVALID = { status: HttpStatus.UNAUTHORIZED, code: 'AUTH_TOKEN_INVALID' };
const FORBIDDEN = { status: HttpStatus.FORBIDDEN, code: 'AUTH_FORBIDDEN' };

describe('AuthService.authenticate (ID token do Firebase)', () => {
  it('aceita token válido e devolve o e-mail em minúsculas', async () => {
    const user = await buildService().authenticate(bearer(signRs256(claims())));
    expect(user).toEqual({ email: 'misael.cruz@sebratel.com.br', name: 'Misael Cruz', role: UserRoleEnum.MASTER });
  });

  it('recusa requisição sem Authorization ou sem Bearer (401 AUTH_REQUIRED)', async () => {
    const service = buildService();
    const required = { status: HttpStatus.UNAUTHORIZED, code: 'AUTH_REQUIRED' };
    expect(await rejection(service.authenticate(undefined))).toEqual(required);
    expect(await rejection(service.authenticate(signRs256(claims())))).toEqual(required);
  });

  it('recusa alg none, com ou sem assinatura', async () => {
    const unsigned = `${encode({ alg: 'none', kid: KID })}.${encode(claims())}`;
    expect(await rejection(buildService().authenticate(bearer(`${unsigned}.`)))).toEqual(INVALID);
    expect(await rejection(buildService().authenticate(bearer(`${unsigned}.qualquer`)))).toEqual(INVALID);
  });

  it('recusa HS256 assinado com a chave pública como segredo (troca de algoritmo)', async () => {
    const unsigned = `${encode({ alg: 'HS256', kid: KID })}.${encode(claims())}`;
    const signature = createHmac('sha256', PUBLIC_PEM).update(unsigned).digest('base64url');
    expect(await rejection(buildService().authenticate(bearer(`${unsigned}.${signature}`)))).toEqual(INVALID);
  });

  it('recusa assinatura adulterada (payload trocado depois de assinar)', async () => {
    const [header, , signature] = signRs256(claims({ email: 'estagiario@sebratel.com.br' })).split('.');
    const forged = `${header}.${encode(claims())}.${signature}`;
    expect(await rejection(buildService().authenticate(bearer(forged)))).toEqual(INVALID);
  });

  it('recusa token assinado por outra chave com o mesmo kid', async () => {
    const token = signRs256(claims(), { alg: 'RS256', kid: KID }, attacker.privateKey);
    expect(await rejection(buildService().authenticate(bearer(token)))).toEqual(INVALID);
  });

  it('recusa kid que não está entre os certificados do Google', async () => {
    const token = signRs256(claims(), { alg: 'RS256', kid: 'kid-desconhecido' });
    expect(await rejection(buildService().authenticate(bearer(token)))).toEqual(INVALID);
  });

  it('recusa token de outro projeto Firebase (aud e iss)', async () => {
    const otherAudience = signRs256(claims({ aud: 'authentication-data-hub' }));
    const otherIssuer = signRs256(claims({ iss: 'https://securetoken.google.com/authentication-data-hub' }));
    expect(await rejection(buildService().authenticate(bearer(otherAudience)))).toEqual(INVALID);
    expect(await rejection(buildService().authenticate(bearer(otherIssuer)))).toEqual(INVALID);
  });

  it('recusa token expirado com código próprio (o frontend renova e tenta de novo)', async () => {
    const expired = signRs256(claims({ iat: NOW - 7200, exp: NOW - 10 }));
    expect(await rejection(buildService().authenticate(bearer(expired)))).toEqual({
      status: HttpStatus.UNAUTHORIZED,
      code: 'AUTH_TOKEN_EXPIRED',
    });
  });

  it('recusa iat mais de 5 minutos no futuro e aceita dentro da tolerância', async () => {
    const future = signRs256(claims({ iat: NOW + 600 }));
    expect(await rejection(buildService().authenticate(bearer(future)))).toEqual(INVALID);
    await expect(buildService().authenticate(bearer(signRs256(claims({ iat: NOW + 120 }))))).resolves.toBeTruthy();
  });

  it('recusa e-mail não verificado (403)', async () => {
    const token = signRs256(claims({ email_verified: false }));
    expect(await rejection(buildService().authenticate(bearer(token)))).toEqual(FORBIDDEN);
  });

  it('recusa conta de outro domínio, inclusive com o domínio no meio do e-mail (403)', async () => {
    const gmail = signRs256(claims({ email: 'misael.cruz@gmail.com' }));
    const lookalike = signRs256(claims({ email: 'misael.cruz@sebratel.com.br.evil.com' }));
    const service = buildService({ AUTH_ADMIN_EMAILS: 'misael.cruz@gmail.com, misael.cruz@sebratel.com.br.evil.com' });
    expect(await rejection(service.authenticate(bearer(gmail)))).toEqual(FORBIDDEN);
    expect(await rejection(service.authenticate(bearer(lookalike)))).toEqual(FORBIDDEN);
  });

  it('conta do domínio sem cadastro entra como Visualizador (toda a organização vê)', async () => {
    const token = signRs256(claims({ email: 'colaborador@sebratel.com.br', name: 'Colaborador' }));
    await expect(buildService().authenticate(bearer(token))).resolves.toEqual({
      email: 'colaborador@sebratel.com.br',
      name: 'Colaborador',
      role: UserRoleEnum.VIEWER,
    });
  });

  it('quem está na tela Usuários entra com o perfil de lá', async () => {
    const token = signRs256(claims({ email: 'Editora@sebratel.com.br', name: 'Editora' }));
    const service = buildService({}, undefined, { 'editora@sebratel.com.br': UserRoleEnum.EDITOR });
    await expect(service.authenticate(bearer(token))).resolves.toEqual({
      email: 'editora@sebratel.com.br',
      name: 'Editora',
      role: UserRoleEnum.EDITOR,
    });
  });

  it('master da stack vence o perfil da tabela (não dá para rebaixar pela tela)', async () => {
    const service = buildService({}, undefined, { 'misael.cruz@sebratel.com.br': UserRoleEnum.VIEWER });
    await expect(service.authenticate(bearer(signRs256(claims())))).resolves.toMatchObject({ role: UserRoleEnum.MASTER });
  });

  it('AUTH_ADMIN_EMAILS vazio: ninguém é master fixo; perfil maior só pela tabela', async () => {
    const service = buildService({ AUTH_ADMIN_EMAILS: '' }, undefined, { 'editora@sebratel.com.br': UserRoleEnum.EDITOR });
    await expect(service.authenticate(bearer(signRs256(claims())))).resolves.toMatchObject({ role: UserRoleEnum.VIEWER });
    const editor = signRs256(claims({ email: 'editora@sebratel.com.br' }));
    await expect(service.authenticate(bearer(editor))).resolves.toMatchObject({ role: UserRoleEnum.EDITOR });
  });

  it('sem certificados disponíveis responde 503, não 401', async () => {
    const config = { get: (key: string) => ({ FIREBASE_PROJECT_ID: PROJECT_ID })[key] } as unknown as ConfigService;
    const failing = {
      getKeys: async () => {
        throw new Error('rede bloqueada');
      },
    } as unknown as FirebaseCertsStore;
    expect(
      await rejection(
        new AuthService(config, failing, usersWith(config), new HubSsoService(config)).authenticate(bearer(signRs256(claims()))),
      ),
    ).toEqual({
      status: HttpStatus.SERVICE_UNAVAILABLE,
      code: 'AUTH_UNAVAILABLE',
    });
  });

  it('AUTH_ENABLED=false devolve o usuário local sem olhar o token', async () => {
    const service = buildService({ AUTH_ENABLED: 'false', FIREBASE_PROJECT_ID: '' });
    await expect(service.authenticate(undefined)).resolves.toEqual(LOCAL_USER);
  });

  describe('HUB_ONLY (acesso só pelo Hub Apps)', () => {
    const HUB = { HUB_SSO_SECRET: 'segredo-do-hub', HUB_APP_ID: 'app-assinaturas', HUB_ONLY: 'true' };
    const editor = { 'editora@sebratel.com.br': UserRoleEnum.EDITOR };

    it('login direto de quem não é master: 403 HUB_ONLY', async () => {
      const token = signRs256(claims({ email: 'editora@sebratel.com.br' }));
      expect(await rejection(buildService(HUB, undefined, editor).authenticate(bearer(token)))).toEqual({
        status: HttpStatus.FORBIDDEN,
        code: 'HUB_ONLY',
      });
    });

    it('master continua entrando direto (porta de emergência se o Hub cair)', async () => {
      await expect(buildService(HUB).authenticate(bearer(signRs256(claims())))).resolves.toMatchObject({ role: UserRoleEnum.MASTER });
    });

    it('quem vem pelo Hub (sessão da troca) entra com o perfil da tela Usuários', async () => {
      const service = buildService(HUB, undefined, editor);
      const session = new HubSsoService(new ConfigServiceStub(HUB) as unknown as ConfigService).issueSession({
        email: 'editora@sebratel.com.br',
        name: 'Editora',
      });
      await expect(service.authenticate(bearer(session.token))).resolves.toEqual({
        email: 'editora@sebratel.com.br',
        name: 'Editora',
        role: UserRoleEnum.EDITOR,
      });
    });

    it('sessão do Hub de quem perdeu o perfil na tela Usuários: volta a Visualizador na hora', async () => {
      const session = new HubSsoService(new ConfigServiceStub(HUB) as unknown as ConfigService).issueSession({
        email: 'saiu@sebratel.com.br',
        name: 'Saiu',
      });
      await expect(buildService(HUB).authenticate(bearer(session.token))).resolves.toMatchObject({ role: UserRoleEnum.VIEWER });
    });

    it('Visualizador (resto da organização) também só entra pelo Hub', async () => {
      const token = signRs256(claims({ email: 'colaborador@sebratel.com.br' }));
      expect(await rejection(buildService(HUB).authenticate(bearer(token)))).toEqual({ status: HttpStatus.FORBIDDEN, code: 'HUB_ONLY' });
    });

    it('sem HUB_SSO_SECRET/HUB_APP_ID o HUB_ONLY é ignorado (senão trancaria todo mundo)', async () => {
      const token = signRs256(claims({ email: 'editora@sebratel.com.br' }));
      await expect(buildService({ HUB_ONLY: 'true' }, undefined, editor).authenticate(bearer(token))).resolves.toMatchObject({
        role: UserRoleEnum.EDITOR,
      });
    });
  });

  it('AUTH_ENABLED=true sem FIREBASE_PROJECT_ID não sobe', () => {
    expect(() => buildService({ FIREBASE_PROJECT_ID: '' })).toThrow(/FIREBASE_PROJECT_ID/);
  });
});
