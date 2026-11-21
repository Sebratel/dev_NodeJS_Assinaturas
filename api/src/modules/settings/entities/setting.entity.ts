import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'settings' })
export class SettingEntity {
  @PrimaryColumn({ name: 'setting_key', type: 'varchar', length: 64 })
  key: string;

  @Column({ name: 'setting_value', type: 'simple-json' })
  value: unknown;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
