import type { LoggerService } from '@nestjs/common';
import type { pino } from 'pino';

type Level = 'info' | 'warn' | 'error' | 'debug' | 'trace' | 'fatal';

/**
 * Ponte entre o Logger do Nest e o pino: os `new Logger(Classe.name)` do código e os logs internos do Nest
 * saem em JSON com os campos padrão. O contexto (nome da classe) vai no campo `logger`.
 */
export class PinoLoggerService implements LoggerService {
  constructor(private readonly logger: pino.Logger) {}

  log(message: unknown, ...params: unknown[]): void {
    this.write('info', message, params);
  }

  warn(message: unknown, ...params: unknown[]): void {
    this.write('warn', message, params);
  }

  debug(message: unknown, ...params: unknown[]): void {
    this.write('debug', message, params);
  }

  verbose(message: unknown, ...params: unknown[]): void {
    this.write('trace', message, params);
  }

  fatal(message: unknown, ...params: unknown[]): void {
    this.write('fatal', message, params);
  }

  /** O Nest chama error(mensagem, stack?, contexto?). Erro vira campo `err` com stack, para o Kibana separar. */
  error(message: unknown, ...params: unknown[]): void {
    const context = typeof params.at(-1) === 'string' && params.length > 1 ? (params.pop() as string) : undefined;
    const stack = typeof params[0] === 'string' ? params[0] : undefined;
    if (message instanceof Error) {
      this.logger.error({ logger: context, err: { message: message.message, stack: message.stack } }, message.message);
      return;
    }
    this.logger.error({ logger: context, ...(stack ? { err: { stack } } : {}) }, String(message));
  }

  private write(level: Level, message: unknown, params: unknown[]): void {
    const context = typeof params.at(-1) === 'string' ? (params.at(-1) as string) : undefined;
    if (typeof message === 'object' && message !== null && !(message instanceof Error)) {
      this.logger[level]({ logger: context, ...(message as Record<string, unknown>) });
      return;
    }
    this.logger[level]({ logger: context }, String(message));
  }
}
