import { MigrationInterface, QueryRunner } from 'typeorm';

const TABLE_OPTIONS = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';
const CREATED_AT = '`created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)';
const UPDATED_AT = '`updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)';

/**
 * 1.2.0: perfis de acesso (tela Usuários). Substitui a lista de teste (setting apply-scope, que fica no banco sem uso).
 * Os masters do AUTH_ADMIN_EMAILS não precisam de linha aqui.
 */
export class CreateUsers1795540000000 implements MigrationInterface {
  name = 'CreateUsers1795540000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`users\` (
      \`id\` varchar(36) NOT NULL,
      \`email\` varchar(254) NOT NULL,
      \`name\` varchar(120) NULL,
      \`role\` varchar(16) NOT NULL,
      \`last_login_at\` datetime(6) NULL,
      \`created_by\` varchar(254) NOT NULL,
      \`updated_by\` varchar(254) NULL,
      ${CREATED_AT},
      ${UPDATED_AT},
      \`deleted_at\` datetime(6) NULL,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`UQ_users_email\` (\`email\`)
    ) ${TABLE_OPTIONS}`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `users`');
  }
}
