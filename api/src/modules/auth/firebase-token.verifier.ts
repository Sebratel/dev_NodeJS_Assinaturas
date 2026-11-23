import { createPublicKey, createVerify, type KeyObject, X509Certificate } from 'node:crypto';

/** Tolerância de relógio para o `iat` (padrao-login-sso: 5 min). */
export const IAT_TOLERANCE_SECONDS = 300;

export interface FirebaseIdTokenClaims {
  uid: string;
  email: string;
  emailVerified: boolean;
  name: string;
}

/** Motivo da recusa: vai para o log e decide o código de erro. Nunca carrega o token. */
export type TokenRejection =
  'MALFORMED' | 'ALGORITHM' | 'UNKNOWN_KEY' | 'SIGNATURE' | 'ISSUER' | 'AUDIENCE' | 'EXPIRED' | 'ISSUED_IN_FUTURE' | 'NO_EMAIL';

export class TokenRejectedError extends Error {
  constructor(readonly reason: TokenRejection) {
    super(`token recusado: ${reason}`);
  }
}

export interface VerifyOptions {
  projectId: string;
  /** kid → certificado X.509 (formato do Google) ou chave pública PEM. */
  keys: Record<string, string>;
  nowSeconds?: number;
}

function decodeSegment(segment: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('segmento não é um objeto');
  return parsed as Record<string, unknown>;
}

function toPublicKey(pem: string): KeyObject {
  return pem.includes('BEGIN CERTIFICATE') ? new X509Certificate(pem).publicKey : createPublicKey(pem);
}

function verifySignature(signedPart: string, signature: string, pem: string): boolean {
  try {
    return createVerify('RSA-SHA256').update(signedPart).verify(toPublicKey(pem), Buffer.from(signature, 'base64url'));
  } catch {
    return false;
  }
}

/**
 * Confere um ID token do Firebase sem chamar o Google a cada requisição (padrao-login-sso):
 * algoritmo fixo RS256, assinatura com o certificado do `kid`, emissor e público do projeto, validade e e-mail.
 * Domínio e lista de acesso ficam com quem chama.
 */
export function verifyFirebaseIdToken(token: string, options: VerifyOptions): FirebaseIdTokenClaims {
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some((part) => !part)) throw new TokenRejectedError('MALFORMED');
  const [encodedHeader, encodedPayload, signature] = parts;

  let header: Record<string, unknown>;
  let payload: Record<string, unknown>;
  try {
    header = decodeSegment(encodedHeader);
    payload = decodeSegment(encodedPayload);
  } catch {
    throw new TokenRejectedError('MALFORMED');
  }

  // Algoritmo fixo: confiar no do cabeçalho abre `alg: none` e a troca RS256 → HS256 com a chave pública.
  if (header.alg !== 'RS256') throw new TokenRejectedError('ALGORITHM');
  const kid = typeof header.kid === 'string' ? header.kid : '';
  const pem = kid && Object.hasOwn(options.keys, kid) ? options.keys[kid] : undefined;
  if (!pem) throw new TokenRejectedError('UNKNOWN_KEY');
  if (!verifySignature(`${encodedHeader}.${encodedPayload}`, signature, pem)) throw new TokenRejectedError('SIGNATURE');

  // As claims só valem depois da assinatura conferida.
  const now = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (payload.iss !== `https://securetoken.google.com/${options.projectId}`) throw new TokenRejectedError('ISSUER');
  // Sem conferir o público, token de qualquer projeto Firebase entraria.
  if (payload.aud !== options.projectId) throw new TokenRejectedError('AUDIENCE');
  if (typeof payload.exp !== 'number' || payload.exp <= now) throw new TokenRejectedError('EXPIRED');
  if (typeof payload.iat !== 'number' || payload.iat > now + IAT_TOLERANCE_SECONDS) throw new TokenRejectedError('ISSUED_IN_FUTURE');
  if (typeof payload.sub !== 'string' || !payload.sub) throw new TokenRejectedError('MALFORMED');

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  if (!email) throw new TokenRejectedError('NO_EMAIL');
  return {
    uid: payload.sub,
    email,
    emailVerified: payload.email_verified !== false,
    name: typeof payload.name === 'string' ? payload.name : '',
  };
}
