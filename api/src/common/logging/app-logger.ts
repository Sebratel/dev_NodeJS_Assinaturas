import { pino } from 'pino';
import { requestContext } from './request-context.js';

/** Mesmo nome no campo `service` do log e no Elastic APM (observabilidade-backend). */
export const SERVICE_NAME = 'assinaturas-backend';

/**
 * Logger da aplicação: JSON numa linha por evento, com os campos padrão (timestamp ISO UTC, level em texto,
 * service, env, msg) e o requestId/userEmail da requisição em andamento. Segredos de cabeçalho saem como [REDACTED].
 */
export function createAppLogger(): pino.Logger {
  return pino({
    level: process.env.LOG_LEVEL ?? 'info',
    base: { service: SERVICE_NAME, env: process.env.NODE_ENV ?? 'development' },
    messageKey: 'msg',
    timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
    formatters: { level: (label) => ({ level: label }) },
    mixin: () => {
      const store = requestContext.getStore();
      return store ? { requestId: store.requestId, ...(store.userEmail ? { userEmail: store.userEmail } : {}) } : {};
    },
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers["set-cookie"]',
        'headers.authorization',
        'headers.cookie',
        'headers["set-cookie"]',
      ],
      censor: '[REDACTED]',
    },
  });
}
