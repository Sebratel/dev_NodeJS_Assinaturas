import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3180);
  // Sem login nesta versão: só escuta em 127.0.0.1 até o SSO (Firebase) entrar.
  const host = process.env.HOST ?? '127.0.0.1';
  await app.listen(port, host);
  new Logger('Bootstrap').log(`API em http://${host}:${port}/api`);
}

void bootstrap();
