import { AsyncLocalStorage } from 'node:async_hooks';

/** O que acompanha a requisição até a última linha de log, mesmo em camadas que não sabem o que é HTTP. */
export interface RequestContextStore {
  requestId: string;
  userEmail?: string;
}

/** Contexto da requisição (observabilidade-backend: requestId via AsyncLocalStorage). */
export const requestContext = new AsyncLocalStorage<RequestContextStore>();

const REQUEST_CONTEXT = Symbol('requestContext');

/** Guarda o contexto também no objeto da requisição: quem tem o `req` em mãos (guard) não depende do AsyncLocalStorage. */
export function attachRequestContext(request: object, store: RequestContextStore): void {
  (request as Record<symbol, RequestContextStore>)[REQUEST_CONTEXT] = store;
}

export function getRequestContext(request: object): RequestContextStore | undefined {
  return (request as Record<symbol, RequestContextStore | undefined>)[REQUEST_CONTEXT] ?? requestContext.getStore();
}
