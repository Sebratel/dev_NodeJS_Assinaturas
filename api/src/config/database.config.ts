import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { resolve } from 'node:path';
import { CreateInitialSchema1795450477057 } from '../migrations/1795450477057-CreateInitialSchema.js';
import { CollaboratorOverrideEntity } from '../modules/directory/entities/collaborator-override.entity.js';
import { PhraseProfileEntity } from '../modules/phrase-profiles/entities/phrase-profile.entity.js';
import { SettingEntity } from '../modules/settings/entities/setting.entity.js';
import { SignatureApplicationEntity } from '../modules/signature-applications/entities/signature-application.entity.js';
import { SignatureRuleEntity } from '../modules/signature-rules/entities/signature-rule.entity.js';
import { SignatureTemplateEntity } from '../modules/signature-templates/entities/signature-template.entity.js';

const ENTITIES = [
  SettingEntity,
  SignatureRuleEntity,
  CollaboratorOverrideEntity,
  SignatureTemplateEntity,
  SignatureApplicationEntity,
  PhraseProfileEntity,
];

/**
 * Migrations do MariaDB, em ordem. Importadas pela classe (e não por glob) para funcionar igual em src (testes) e dist.
 * Migration nova: arquivo `src/migrations/{timestamp}-Nome.ts` e uma linha aqui. Nunca editar uma que já rodou.
 */
export const MIGRATIONS = [CreateInitialSchema1795450477057];

/**
 * DB_TYPE=sqljs → arquivo local (desenvolvimento, sem servidor de banco; cria as tabelas sozinho).
 * DB_TYPE=mariadb → servidor da empresa (produção; tabelas por migration ao subir, nunca synchronize).
 */
export function buildDatabaseConfig(config: ConfigService): TypeOrmModuleOptions {
  const type = String(config.get('DB_TYPE') ?? 'sqljs').toLowerCase();
  if (type === 'mariadb') {
    return {
      type: 'mariadb',
      host: config.getOrThrow<string>('DB_HOST'),
      port: Number(config.get('DB_PORT') ?? 3306),
      username: config.getOrThrow<string>('DB_USER'),
      password: config.getOrThrow<string>('DB_PASSWORD'),
      database: config.getOrThrow<string>('DB_NAME'),
      entities: ENTITIES,
      migrations: MIGRATIONS,
      migrationsRun: true,
      migrationsTableName: 'typeorm_migrations',
      synchronize: false,
      timezone: 'Z',
      charset: 'utf8mb4_unicode_ci',
    };
  }
  if (type === 'sqljs') {
    return {
      type: 'sqljs',
      location: resolve(config.get('DB_SQLJS_PATH') ?? '../data/assinaturas.sqlite'),
      autoSave: true,
      entities: ENTITIES,
      synchronize: true,
    };
  }
  throw new Error(`DB_TYPE inválido: "${type}" (use sqljs ou mariadb).`);
}
