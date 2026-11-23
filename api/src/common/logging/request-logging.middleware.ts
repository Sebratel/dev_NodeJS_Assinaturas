import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import type { pino } from 'pino';
import { attachRequestContext, requestContext, type RequestContextStore } from './request-context.js';

const MAX_REQUEST_ID_LENGTH = 200;

/** Requisições que não entram no log de acesso em `info`: arquivos do frontend e o health do Docker (a cada 10 s). */
function isRoutine(path: string, status: number): boolean {
  if (status >= 400) return false;
  return path === '/api/health' || !path.startsWith('/api/');
}

/**
 * observabilidade-backend: requestId reaproveitado do X-Request-Id (até 200 caracteres) ou gerado, guardado no
 * AsyncLocalStorage, devolvido no cabeçalho da resposta, e UM log no fim da requisição com o nível pelo resultado.
 */
export function requestLoggingMiddleware(logger: pino.Logger, slowRequestMs: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const incoming = req.headers['x-request-id'];
    const requestId =
      typeof incoming === 'string' && incoming.trim() && incoming.length <= MAX_REQUEST_ID_LENGTH ? incoming.trim() : randomUUID();
    res.setHeader('X-Request-Id', requestId);

    const store: RequestContextStore = { requestId };
    attachRequestContext(req, store);
    const started = process.hrtime.bigint();
    let logged = false;

    const finish = (aborted: boolean) => {
      if (logged) return;
      logged = true;
      const durationMs = Math.round(Number(process.hrtime.bigint() - started) / 1e6);
      const status = res.statusCode;
      // Listener de evento não roda dentro do AsyncLocalStorage: os campos vão explícitos.
      const fields = { requestId, userEmail: store.userEmail, method: req.method, path: req.path, status, durationMs };
      if (aborted) logger.warn(fields, 'request aborted');
      else if (status >= 500) logger.error(fields, 'request completed');
      else if (status >= 400) logger.warn(fields, 'request completed');
      else if (durationMs >= slowRequestMs) logger.warn(fields, 'slow request');
      else if (isRoutine(req.path, status)) logger.debug(fields, 'request completed');
      else logger.info(fields, 'request completed');
    };
    res.on('finish', () => finish(false));
    // Cliente desistiu (fechou a aba, timeout do proxy) antes da resposta terminar.
    res.on('close', () => {
      if (!res.writableFinished) finish(true);
    });

    requestContext.run(store, () => next());
  };
}
