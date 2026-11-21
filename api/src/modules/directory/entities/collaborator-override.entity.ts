import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** Dados que não vêm do AD e o próprio colaborador informa (hoje: celular de Direção/Gerência). */
@Entity({ name: 'collaborator_overrides' })
export class CollaboratorOverrideEntity {
  @PrimaryColumn({ name: 'collaborator_id', type: 'varchar', length: 64 })
  collaboratorId: string;

  @Column({ name: 'informed_mobile', type: 'varchar', length: 20, default: '' })
  informedMobile: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
