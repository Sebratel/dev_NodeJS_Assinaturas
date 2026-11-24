import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { GmailSignatureClient } from '../google-integration/gmail-signature.client.js';
import { GoogleCredentialsService } from '../google-integration/google-credentials.service.js';
import { GMAIL_SIGNATURE_MAX_LENGTH } from '../signatures/signature-template.helper.js';
import { SignaturesService } from '../signatures/signatures.service.js';
import { SignatureStatusEnum } from '../signatures/types/signature-status.enum.js';
import { CreateApplicationBatchDTO } from './dto/create-application-batch.dto.js';
import { SignatureApplicationEntity } from './entities/signature-application.entity.js';
import { ApplicationStatusEnum } from './types/application-status.enum.js';
import type { ApplicationTrigger } from './types/application-trigger.js';

export interface ApplicationBatch {
  id: string;
  total: number;
  processed: number;
  counts: Record<ApplicationStatusEnum, number>;
  includePending: boolean;
  trigger: ApplicationTrigger;
  /** E-mail de quem pediu ou AUTO. */
  requestedBy: string;
  finished: boolean;
  startedAt: string;
  finishedAt: string | null;
  items: Array<{ collaboratorId: string; name: string; email: string; status: ApplicationStatusEnum; reason: string }>;
}

export interface WriteIndexEntry {
  lastWrite: { status: ApplicationStatusEnum; renderedSignature: string | null; at: Date } | null;
  received: boolean;
  lastFailureAt: Date | null;
}

const CONCURRENCY = 3;
const STATUS_TEXT: Record<SignatureStatusEnum, string> = {
  READY: 'pronta',
  PENDING: 'pendente',
  CONFLICT: 'com conflito de regras',
  NO_RULE: 'sem regra',
};

/**
 * Grava assinaturas no Gmail em lote. Regras de segurança:
 * - só grava se a delegação estiver autorizada;
 * - só um usuário MASTER pede gravação (perfil conferido na rota; a antiga lista de teste saiu na 1.2.0);
 * - nunca grava conflito ou "sem regra"; pendente só se o lote pedir;
 * - guarda a assinatura anterior de cada pessoa para desfazer.
 * O andamento do lote fica em memória (uma instância); o histórico fica no banco.
 */
@Injectable()
export class SignatureApplicationsService {
  private readonly logger = new Logger(SignatureApplicationsService.name);
  private readonly batches = new Map<string, ApplicationBatch>();

  constructor(
    @InjectRepository(SignatureApplicationEntity) private readonly applicationRepository: Repository<SignatureApplicationEntity>,
    private readonly signaturesService: SignaturesService,
    private readonly credentials: GoogleCredentialsService,
    private readonly gmail: GmailSignatureClient,
  ) {}

  async startBatch(
    dto: CreateApplicationBatchDTO,
    origin: { trigger: ApplicationTrigger; requestedBy: string },
  ): Promise<ApplicationBatch> {
    const { trigger, requestedBy } = origin;
    await this.assertGoogleReady();
    let ids = dto.collaboratorIds ?? [];
    if (!ids.length && dto.filter) {
      ids = (await this.signaturesService.listCollaborators({ ...dto.filter, page: 1, pageSize: 100 })).map((c) => c.id);
    }
    ids = [...new Set(ids)];
    if (!ids.length) throw new BusinessException('APPLICATION_EMPTY', 'Nenhum colaborador selecionado.', HttpStatus.BAD_REQUEST);
    if (ids.length > 2000)
      throw new BusinessException('APPLICATION_TOO_LARGE', 'Máximo de 2000 colaboradores por lote.', HttpStatus.BAD_REQUEST);

    const batch: ApplicationBatch = {
      id: randomUUID(),
      total: ids.length,
      processed: 0,
      counts: Object.fromEntries(Object.values(ApplicationStatusEnum).map((s) => [s, 0])) as Record<ApplicationStatusEnum, number>,
      includePending: dto.includePending,
      trigger,
      requestedBy,
      finished: false,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      items: [],
    };
    this.batches.set(batch.id, batch);
    void this.run(batch, ids);
    return batch;
  }

  getBatch(id: string): ApplicationBatch {
    const batch = this.batches.get(id);
    if (!batch)
      throw new BusinessException('APPLICATION_BATCH_NOT_FOUND', 'Lote não encontrado (a API pode ter reiniciado).', HttpStatus.NOT_FOUND);
    return batch;
  }

  findHistory(collaboratorId?: string, take = 50): Promise<SignatureApplicationEntity[]> {
    return this.applicationRepository.find({
      where: collaboratorId ? { collaboratorId } : {},
      order: { createdAt: 'DESC' },
      take,
      // Sem os HTML (pesados): a tela só precisa do resumo.
      select: {
        id: true,
        batchId: true,
        collaboratorId: true,
        collaboratorName: true,
        email: true,
        sendAsEmail: true,
        status: true,
        reason: true,
        signatureStatus: true,
        templateId: true,
        trigger: true,
        requestedBy: true,
        createdAt: true,
      },
    });
  }

  /**
   * Resumo do histórico por pessoa, para a gravação automática decidir:
   * última escrita no Gmail (gravada ou desfeita), se já recebeu alguma vez e a última falha.
   */
  async writeIndex(): Promise<Map<string, WriteIndexEntry>> {
    const rows = await this.applicationRepository.find({
      order: { createdAt: 'DESC' },
      select: { collaboratorId: true, status: true, renderedSignature: true, createdAt: true },
    });
    const index = new Map<string, WriteIndexEntry>();
    for (const row of rows) {
      const entry = index.get(row.collaboratorId) ?? { lastWrite: null, received: false, lastFailureAt: null };
      const isWrite = row.status === ApplicationStatusEnum.APPLIED || row.status === ApplicationStatusEnum.RESTORED;
      if (isWrite && !entry.lastWrite)
        entry.lastWrite = { status: row.status, renderedSignature: row.renderedSignature, at: row.createdAt };
      if (row.status === ApplicationStatusEnum.APPLIED || row.status === ApplicationStatusEnum.UNCHANGED) entry.received = true;
      if (row.status === ApplicationStatusEnum.FAILED && !entry.lastFailureAt) entry.lastFailureAt = row.createdAt;
      index.set(row.collaboratorId, entry);
    }
    return index;
  }

  /** Devolve ao Gmail a assinatura que existia antes desta gravação. */
  async restore(applicationId: string, requestedBy: string): Promise<SignatureApplicationEntity> {
    await this.assertGoogleReady();
    const application = await this.applicationRepository.findOneBy({ id: applicationId });
    if (!application) throw new BusinessException('APPLICATION_NOT_FOUND', 'Gravação não encontrada.', HttpStatus.NOT_FOUND);
    if (application.status !== ApplicationStatusEnum.APPLIED || application.previousSignature === null) {
      throw new BusinessException(
        'APPLICATION_NOT_RESTORABLE',
        'Só dá para desfazer uma gravação feita, com cópia da anterior.',
        HttpStatus.CONFLICT,
      );
    }
    // Desfazer uma gravação antiga apagaria as mais novas: só a última escrita no Gmail pode voltar.
    const lastWrite = await this.applicationRepository.findOne({
      where: [
        { collaboratorId: application.collaboratorId, status: ApplicationStatusEnum.APPLIED },
        { collaboratorId: application.collaboratorId, status: ApplicationStatusEnum.RESTORED },
      ],
      order: { createdAt: 'DESC' },
      select: { id: true },
    });
    if (lastWrite?.id !== application.id) {
      throw new BusinessException('APPLICATION_NOT_LATEST', 'Só a gravação mais recente pode ser desfeita.', HttpStatus.CONFLICT);
    }
    const primary = await this.gmail.getPrimary(application.email);
    const returned = await this.gmail.updateSignature(application.email, primary.sendAsEmail, application.previousSignature);
    return this.applicationRepository.save(
      this.applicationRepository.create({
        batchId: application.batchId,
        collaboratorId: application.collaboratorId,
        collaboratorName: application.collaboratorName,
        email: application.email,
        sendAsEmail: primary.sendAsEmail,
        status: ApplicationStatusEnum.RESTORED,
        requestedBy,
        reason: `Desfeita a gravação de ${application.createdAt.toISOString()}.`,
        previousSignature: primary.signature,
        renderedSignature: application.previousSignature,
        gmailSignature: returned,
      }),
    );
  }

  private async assertGoogleReady(): Promise<void> {
    const delegation = await this.credentials.checkDelegation();
    if (delegation.status !== 'AUTHORIZED') {
      throw new BusinessException(
        'GOOGLE_NOT_AUTHORIZED',
        `Google não autorizado: ${delegation.error ?? delegation.status}.`,
        HttpStatus.CONFLICT,
      );
    }
  }

  private async run(batch: ApplicationBatch, ids: string[]): Promise<void> {
    const queue = [...ids];
    const worker = async () => {
      for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
        await this.applyOne(batch, id);
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ids.length) }, worker));
    batch.finished = true;
    batch.finishedAt = new Date().toISOString();
    this.logger.log(`Lote ${batch.id}: ${JSON.stringify(batch.counts)}`);
  }

  private async applyOne(batch: ApplicationBatch, collaboratorId: string): Promise<void> {
    const base: Partial<SignatureApplicationEntity> = { batchId: batch.id, collaboratorId, email: '', collaboratorName: '' };
    try {
      const signature = await this.signaturesService.getCollaboratorSignature(collaboratorId);
      const { collaborator, evaluation } = signature;
      Object.assign(base, {
        email: collaborator.email,
        collaboratorName: collaborator.name,
        signatureStatus: evaluation.status,
        templateId: signature.template.id,
      });

      const allowed =
        evaluation.status === SignatureStatusEnum.READY || (evaluation.status === SignatureStatusEnum.PENDING && batch.includePending);
      if (!allowed) return await this.record(batch, base, ApplicationStatusEnum.SKIPPED, `Assinatura ${STATUS_TEXT[evaluation.status]}.`);
      if (signature.htmlLength > GMAIL_SIGNATURE_MAX_LENGTH) {
        return await this.record(
          batch,
          base,
          ApplicationStatusEnum.SKIPPED,
          `Passa do limite do Gmail (${signature.htmlLength} caracteres).`,
        );
      }

      const primary = await this.gmail.getPrimary(collaborator.email);
      base.sendAsEmail = primary.sendAsEmail;
      const last = await this.applicationRepository.findOne({
        where: { collaboratorId, status: ApplicationStatusEnum.APPLIED },
        order: { createdAt: 'DESC' },
      });
      if (last && last.renderedSignature === signature.html && last.gmailSignature === primary.signature) {
        return await this.record(batch, base, ApplicationStatusEnum.UNCHANGED, 'Já estava com esta assinatura.');
      }

      const returned = await this.gmail.updateSignature(collaborator.email, primary.sendAsEmail, signature.html);
      await this.record(
        batch,
        { ...base, previousSignature: primary.signature, renderedSignature: signature.html, gmailSignature: returned },
        ApplicationStatusEnum.APPLIED,
        '',
      );
    } catch (error) {
      await this.record(batch, base, ApplicationStatusEnum.FAILED, GoogleCredentialsService.errorMessage(error).slice(0, 480));
    }
  }

  private async record(
    batch: ApplicationBatch,
    data: Partial<SignatureApplicationEntity>,
    status: ApplicationStatusEnum,
    reason: string,
  ): Promise<void> {
    await this.applicationRepository.save(
      this.applicationRepository.create({ ...data, status, reason, trigger: batch.trigger, requestedBy: batch.requestedBy }),
    );
    batch.processed++;
    batch.counts[status]++;
    batch.items.push({
      collaboratorId: data.collaboratorId ?? '',
      name: data.collaboratorName ?? '',
      email: data.email ?? '',
      status,
      reason,
    });
  }
}
