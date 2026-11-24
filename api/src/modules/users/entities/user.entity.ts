import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { UserRoleEnum } from '../types/user-role.enum.js';

/**
 * Quem pode entrar no sistema e com que perfil. Os masters do AUTH_ADMIN_EMAILS (stack) não precisam de linha aqui.
 * Remover = exclusão lógica; incluir de novo o mesmo e-mail restaura a linha (e-mail é único).
 */
@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Sempre em minúsculas. */
  @Index('UQ_users_email', { unique: true })
  @Column({ type: 'varchar', length: 254 })
  email: string;

  /** Nome da conta Google, preenchido no primeiro acesso. */
  @Column({ type: 'varchar', length: 120, nullable: true })
  name: string | null;

  @Column({ type: 'varchar', length: 16 })
  role: UserRoleEnum;

  @Column({ name: 'last_login_at', type: 'datetime', nullable: true })
  lastLoginAt: Date | null;

  @Column({ name: 'created_by', type: 'varchar', length: 254 })
  createdBy: string;

  @Column({ name: 'updated_by', type: 'varchar', length: 254, nullable: true })
  updatedBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
