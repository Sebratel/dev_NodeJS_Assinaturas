import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { createAppLogger } from './common/logging/app-logger.js';
import { PinoLoggerService } from './common/logging/pino-logger.service.js';
import { requestLoggingMiddleware } from './common/logging/request-logging.middleware.js';
import { APP_VERSION } from './config/app-version.js';

const logger = createAppLogger();

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  app.useLogger(new PinoLoggerService(logger));
  app.disable('x-powered-by');

  // Primeiro middleware: toda requisição ganha requestId e um log de acesso.
  // As telas ficam no container `frontend` (nginx), que repassa /api para cá pela rede interna da stack.
  app.use(requestLoggingMiddleware(logger, Number(process.env.SLOW_REQUEST_MS ?? 5000)));

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3180);
  const host = process.env.HOST ?? '127.0.0.1';
  await app.listen(port, host);
  logger.info({ host, port, version: APP_VERSION }, 'server started');
}

bootstrap().catch((error: unknown) => {
  const err = error instanceof Error ? error : new Error(String(error));
  logger.fatal({ err: { type: err.name, message: err.message, stack: err.stack } }, 'server failed to start');
  process.exitCode = 1;
});
