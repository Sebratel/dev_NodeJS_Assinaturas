import type { MigrationInterface, QueryRunner } from 'typeorm';

const TABLE_OPTIONS = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';
const CREATED_AT = '`created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)';
const UPDATED_AT = '`updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)';

/**
 * Esquema inicial do MariaDB, igual às entidades. UUID é gerado pelo TypeORM no Node (varchar(36), sem DEFAULT no banco).
 * Exceções registradas ao padrão de PK `id`: `settings` (chave natural `setting_key`) e `collaborator_overrides`
 * (chave = id do colaborador no AD), mantidas para não migrar dados do banco local.
 */
export class CreateInitialSchema1795450477057 implements MigrationInterface {
  name = 'CreateInitialSchema1795450477057';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Valor em JSON; mediumtext porque as frases por time crescem com a planilha importada.
    await queryRunner.query(`CREATE TABLE \`settings\` (
      \`setting_key\` varchar(64) NOT NULL,
      \`setting_value\` mediumtext NOT NULL,
      ${UPDATED_AT},
      PRIMARY KEY (\`setting_key\`)
    ) ${TABLE_OPTIONS}`);

    await queryRunner.query(`CREATE TABLE \`signature_rules\` (
      \`id\` varchar(36) NOT NULL,
      \`name\` varchar(80) NOT NULL,
      \`description\` varchar(300) NOT NULL DEFAULT '',
      \`priority\` int NOT NULL DEFAULT 0,
      \`is_active\` tinyint NOT NULL DEFAULT 1,
      \`conditions\` text NOT NULL,
      \`outputs\` text NOT NULL,
      ${CREATED_AT},
      ${UPDATED_AT},
      \`deleted_at\` datetime(6) NULL,
      PRIMARY KEY (\`id\`)
    ) ${TABLE_OPTIONS}`);

    await queryRunner.query(`CREATE TABLE \`collaborator_overrides\` (
      \`collaborator_id\` varchar(64) NOT NULL,
      \`informed_mobile\` varchar(20) NOT NULL DEFAULT '',
      ${UPDATED_AT},
      PRIMARY KEY (\`collaborator_id\`)
    ) ${TABLE_OPTIONS}`);

    await queryRunner.query(`CREATE TABLE \`signature_templates\` (
      \`id\` varchar(36) NOT NULL,
      \`name\` varchar(80) NOT NULL,
      \`description\` varchar(300) NOT NULL DEFAULT '',
      \`html\` text NOT NULL,
      \`is_default\` tinyint NOT NULL DEFAULT 0,
      ${CREATED_AT},
      ${UPDATED_AT},
      \`deleted_at\` datetime(6) NULL,
      PRIMARY KEY (\`id\`)
    ) ${TABLE_OPTIONS}`);

    await queryRunner.query(`CREATE TABLE \`signature_applications\` (
      \`id\` varchar(36) NOT NULL,
      \`batch_id\` varchar(36) NOT NULL,
      \`collaborator_id\` varchar(64) NOT NULL,
      \`collaborator_name\` varchar(160) NOT NULL DEFAULT '',
      \`email\` varchar(160) NOT NULL,
      \`send_as_email\` varchar(160) NULL,
      \`status\` varchar(16) NOT NULL,
      \`trigger_type\` varchar(16) NOT NULL DEFAULT 'MANUAL',
      \`requested_by\` varchar(160) NULL,
      \`reason\` varchar(500) NOT NULL DEFAULT '',
      \`signature_status\` varchar(16) NULL,
      \`template_id\` varchar(36) NULL,
      \`previous_signature\` text NULL,
      \`rendered_signature\` text NULL,
      \`gmail_signature\` text NULL,
      ${CREATED_AT},
      PRIMARY KEY (\`id\`),
      INDEX \`idx_signature_applications_collaborator_id\` (\`collaborator_id\`)
    ) ${TABLE_OPTIONS}`);

    await queryRunner.query(`CREATE TABLE \`phrase_profiles\` (
      \`id\` varchar(36) NOT NULL,
      \`name\` varchar(80) NOT NULL,
      \`priority\` int NOT NULL DEFAULT 0,
      \`is_active\` tinyint NOT NULL DEFAULT 1,
      \`conditions\` text NOT NULL,
      \`phrase\` varchar(140) NOT NULL,
      ${CREATED_AT},
      ${UPDATED_AT},
      \`deleted_at\` datetime(6) NULL,
      PRIMARY KEY (\`id\`)
    ) ${TABLE_OPTIONS}`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [
      'phrase_profiles',
      'signature_applications',
      'signature_templates',
      'collaborator_overrides',
      'signature_rules',
      'settings',
    ]) {
      await queryRunner.query(`DROP TABLE \`${table}\``);
    }
  }
}
