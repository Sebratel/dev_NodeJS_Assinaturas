import { readFileSync } from 'node:fs';

/** Versão do package.json (src/config e dist/config ficam a dois níveis da raiz da API). */
export const APP_VERSION: string = (() => {
  try {
    const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
})();
