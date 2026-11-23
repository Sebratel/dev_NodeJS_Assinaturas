import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { ApplicationStatusEnum } from '../types/application-status.enum.js';

/** Histórico de cada gravação no Gmail. Guarda a assinatura anterior para poder desfazer. */
@Entity({ name: 'signature_applications' })
export class SignatureApplicationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'batch_id', type: 'varchar', length: 36 })
  batchId: string;

  @Index('idx_signature_applications_collaborator_id')
  @Column({ name: 'collaborator_id', type: 'varchar', length: 64 })
  collaboratorId: string;

  @Column({ name: 'collaborator_name', type: 'varchar', length: 160, default: '' })
  collaboratorName: string;

  @Column({ type: 'varchar', length: 160 })
  email: string;

  @Column({ name: 'send_as_email', type: 'varchar', length: 160, nullable: true })
  sendAsEmail: string | null;

  @Column({ type: 'varchar', length: 16 })
  status: ApplicationStatusEnum;

  @Column({ type: 'varchar', length: 500, default: '' })
  reason: string;

  @Column({ name: 'signature_status', type: 'varchar', length: 16, nullable: true })
  signatureStatus: string | null;

  @Column({ name: 'template_id', type: 'varchar', length: 36, nullable: true })
  templateId: string | null;

  @Column({ name: 'previous_signature', type: 'text', nullable: true })
  previousSignature: string | null;

  /** HTML gerado pelo sistema. */
  @Column({ name: 'rendered_signature', type: 'text', nullable: true })
  renderedSignature: string | null;

  /** HTML como o Gmail devolveu depois de gravar (ele normaliza). */
  @Column({ name: 'gmail_signature', type: 'text', nullable: true })
  gmailSignature: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
