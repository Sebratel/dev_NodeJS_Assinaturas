/**
 * Preload do Elastic APM (observabilidade-backend): `node -r ./apm.cjs dist/main.js`.
 * O agente precisa iniciar antes de qualquer import para instrumentar http, express e mysql2; em ESM, o preload
 * de um .cjs é o jeito suportado de garantir essa ordem.
 *
 * - Sem ELASTIC_APM_SERVER_URL, não inicia (senão tenta 127.0.0.1:8200 e loga falha em loop). CI e dev local: vazio.
 * - Falha do agente nunca derruba o processo.
 * - Variáveis ELASTIC_APM_* têm precedência sobre os padrões abaixo.
 */
const { existsSync } = require('node:fs');
const { join } = require('node:path');

// Em dev local o preload roda antes do ConfigModule ler o .env; carrega aqui para o APM local funcionar.
// Não sobrescreve o que já veio do ambiente. No container não existe .env (o .dockerignore tira).
const envFile = join(__dirname, '.env');
if (existsSync(envFile) && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(envFile);
  } catch {
    // .env ilegível: segue com o ambiente do processo.
  }
}

const serverUrl = String(process.env.ELASTIC_APM_SERVER_URL || '').trim();
let apm = null;

if (serverUrl !== '') {
  try {
    apm = require('elastic-apm-node').start({
      serviceName: process.env.ELASTIC_APM_SERVICE_NAME || 'assinaturas-backend',
      serverUrl,
      environment: process.env.ELASTIC_APM_ENVIRONMENT || process.env.NODE_ENV || 'development',
      serviceVersion: require('./package.json').version,
      captureBody: 'off', // corpo pode ter dado de colaborador e HTML de assinatura
      captureHeaders: false, // authorization/cookie fora, sem depender de sanitização
      transactionIgnoreUrls: ['/api/health'], // healthcheck a cada 10 s não é tráfego útil
      captureExceptions: true,
    });
  } catch (error) {
    // Último recurso: o logger da aplicação ainda não existe neste ponto.
    process.stderr.write(`[apm] falha ao iniciar o agente: ${error && error.message ? error.message : error}\n`);
  }
}

module.exports = apm;
