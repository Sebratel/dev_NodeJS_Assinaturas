import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { pino } from 'pino';

/**
 * Serve o frontend (build do Vite) pela própria API: um container só, mesma origem, sem CORS.
 * Arquivos de /assets têm hash no nome e ficam em cache por 1 ano; o index.html nunca fica em cache
 * (senão quem já abriu o sistema não recebe a versão nova). Rotas da SPA caem no index.html.
 */
export function serveWebApp(app: NestExpressApplication, logger: pino.Logger): void {
  const webDist = resolve(process.env.WEB_DIST_PATH ?? '../web/dist');
  const indexHtml = join(webDist, 'index.html');
  if (!existsSync(indexHtml)) {
    logger.warn({ webDist }, 'web build not found: serving only the API');
    return;
  }

  app.useStaticAssets(webDist, {
    index: false,
    setHeaders: (res, path) => {
      const immutable = path.includes(`${join(webDist, 'assets')}`);
      res.setHeader('Cache-Control', immutable ? 'public, max-age=31536000, immutable' : 'no-cache');
    },
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    const isApi = req.path === '/api' || req.path.startsWith('/api/');
    if ((req.method !== 'GET' && req.method !== 'HEAD') || isApi) return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(indexHtml);
  });

  logger.info({ webDist }, 'serving web app');
}
