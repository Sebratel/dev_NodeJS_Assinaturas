import { Column, CreateDateColumn, DeleteDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import type { RuleCondition } from '../../signature-rules/types/signature-rule.types.js';

@Entity({ name: 'phrase_profiles' })
export class PhraseProfileEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'simple-json' })
  conditions: RuleCondition[];

  @Column({ type: 'varchar', length: 140 })
  phrase: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /** Exclusão lógica: some das telas e do motor, a linha fica no banco. */
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
