import { HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { HubSsoService } from './hub-sso.service.js';

Logger.overrideLogger(false);

const SECRET = 'segredo-do-hub';
const APP_ID = '16651205-0436-4ed8-80b1-d7ab4da9e48a';
const NOW = Math.floor(Date.now() / 1000);
const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

/** Monta o token como o hub-api monta (jsonwebtoken, HS256, 5 min): sub, email, name, appId, iat, exp. */
function hubToken(overrides: Record<string, unknown> = {}, secret = SECRET, header: object = { alg: 'HS256', typ: 'JWT' }): string {
  const payload = { sub: 'uid-1', email: 'Pessoa@sebratel.com.br', name: 'Pessoa', appId: APP_ID, iat: NOW, exp: NOW + 300, ...overrides };
  const unsigned = `${encode(header)}.${encode(payload)}`;
  return `${unsigned}.${createHmac('sha256', secret).update(unsigned).digest('base64url')}`;
}

function service(env: Record<string, string> = {}) {
  return new HubSsoService(new ConfigService({ HUB_SSO_SECRET: SECRET, HUB_APP_ID: APP_ID, ...env }));
}

function failure(fn: () => unknown): { status: number; code: string } {
  try {
    fn();
  } catch (error) {
    if (error instanceof BusinessException) return { status: error.getStatus(), code: error.code };
    throw error;
  }
  throw new Error('deveria ter recusado');
}

describe('HubSsoService', () => {
  it('token do Hub vira sessão própria, com o e-mail em minúsculas', () => {
    const hub = service();
    const identity = hub.exchange(hubToken());
    expect(identity).toEqual({ email: 'pessoa@sebratel.com.br', name: 'Pessoa' });
    const session = hub.issueSession(identity);
    expect(hub.verifySession(session.token)).toEqual(identity);
    expect(Date.parse(session.expiresAt) - Date.now()).toBeGreaterThan(7.9 * 3600 * 1000);
  });

  it('o mesmo token não entra duas vezes', () => {
    const hub = service();
    const token = hubToken();
    hub.exchange(token);
    expect(failure(() => hub.exchange(token))).toEqual({ status: HttpStatus.UNAUTHORIZED, code: 'HUB_TOKEN_USED' });
  });

  it('token emitido para outro app do Hub: 403', () => {
    expect(failure(() => service().exchange(hubToken({ appId: '71d9f60e-fdbb-4ee8-9350-74eb908375c4' })))).toEqual({
      status: HttpStatus.FORBIDDEN,
      code: 'HUB_TOKEN_OTHER_APP',
    });
  });

  it('outro segredo, alg none, vencido ou iat no futuro: 401', () => {
    const invalid = { status: HttpStatus.UNAUTHORIZED, code: 'HUB_TOKEN_INVALID' };
    expect(failure(() => service().exchange(hubToken({}, 'outro-segredo')))).toEqual(invalid);
    const none = `${encode({ alg: 'none' })}.${encode({ email: 'pessoa@sebratel.com.br', appId: APP_ID, iat: NOW, exp: NOW + 300 })}.`;
    expect(failure(() => service().exchange(none))).toEqual(invalid);
    expect(failure(() => service().exchange(hubToken({ iat: NOW - 900, exp: NOW - 1 })))).toEqual({
      status: HttpStatus.UNAUTHORIZED,
      code: 'HUB_TOKEN_EXPIRED',
    });
    expect(failure(() => service().exchange(hubToken({ iat: NOW + 3600, exp: NOW + 3900 })))).toEqual(invalid);
    expect(failure(() => service().exchange('lixo'))).toEqual(invalid);
  });

  it('e-mail fora do domínio: 403, mesmo com token válido', () => {
    expect(failure(() => service().exchange(hubToken({ email: 'pessoa@gmail.com' })))).toEqual({
      status: HttpStatus.FORBIDDEN,
      code: 'HUB_DOMAIN',
    });
    expect(failure(() => service().exchange(hubToken({ email: 'pessoa@sebratel.com.br.evil.com' })))).toMatchObject({ code: 'HUB_DOMAIN' });
  });

  it('token do Hub não vale como sessão, e a sessão não vale como token do Hub', () => {
    const hub = service();
    expect(hub.verifySession(hubToken())).toBeNull();
    const session = hub.issueSession({ email: 'pessoa@sebratel.com.br', name: 'Pessoa' });
    expect(failure(() => hub.exchange(session.token))).toMatchObject({ status: HttpStatus.UNAUTHORIZED });
  });

  it('sessão adulterada (e-mail trocado) é recusada', () => {
    const hub = service();
    const [header, , signature] = hub.issueSession({ email: 'leitor@sebratel.com.br', name: 'Leitor' }).token.split('.');
    const forged = `${header}.${encode({ iss: 'assinaturas', aud: 'hub-session', email: 'master@sebratel.com.br', iat: NOW, exp: NOW + 3600 })}.${signature}`;
    expect(hub.verifySession(forged)).toBeNull();
  });

  it('sem segredo ou id do app: troca dá 503, nenhuma sessão vale e HUB_ONLY fica desligado', () => {
    const off = service({ HUB_SSO_SECRET: '', HUB_ONLY: 'true' });
    expect(failure(() => off.exchange(hubToken()))).toEqual({ status: HttpStatus.SERVICE_UNAVAILABLE, code: 'HUB_NOT_CONFIGURED' });
    expect(off.isHubOnly()).toBe(false);
    expect(service({ HUB_ONLY: 'true' }).isHubOnly()).toBe(true);
  });
});
