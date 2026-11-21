import { Column, CreateDateColumn, DeleteDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import type { RuleCondition, RuleOutputs } from '../types/signature-rule.types.js';

@Entity({ name: 'signature_rules' })
export class SignatureRuleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ type: 'varchar', length: 300, default: '' })
  description: string;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'simple-json' })
  conditions: RuleCondition[];

  @Column({ type: 'simple-json' })
  outputs: RuleOutputs;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /** Exclusão lógica: a regra some das telas e do motor, mas a linha fica no banco. */
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
