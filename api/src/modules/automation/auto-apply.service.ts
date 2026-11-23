import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BusinessException } from '../../common/exceptions/business.exception.js';
import { DirectoryService } from '../directory/directory.service.js';
import { GoogleCredentialsService } from '../google-integration/google-credentials.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { SettingKeyEnum } from '../settings/types/setting-key.enum.js';
import { SignatureApplicationsService } from '../signature-applications/signature-applications.service.js';
import { SignaturesService } from '../signatures/signatures.service.js';
import { SignatureStatusEnum } from '../signatures/types/signature-status.enum.js';
import { AutoApplyPlanner } from './auto-apply.planner.js';

export interface AutoApplyRun {
  at: string;
  origin: 'SYNC' | 'MANUAL';
  outcome: 'OFF' | 'GOOGLE_NOT_READY' | 'NOTHING' | 'STARTED' | 'WAITING_APPROVAL' | 'ERROR';
  message: string;
  newcomers: number;
  changes: number;
  waitingData: number;
  retryLater: number;
  batchIds: string[];
}

/** Lote acima do limite fica aqui até alguém aprovar no Monitoramento. */
interface PendingApproval {
  detectedAt: string;
  newcomers: string[];
  changes: string[];
}

/**
 * Gravação automática: roda depois de cada leitura do AD (e pelo botão "Verificar agora").
 * Uma execução por vez; o histórico de cada gravação fica em signature_applications (trigger AUTO_*).
 */
@Injectable()
export class AutoApplyService implements OnModuleInit {
  private readonly logger = new Logger(AutoApplyService.name);
  private running = false;
  private current: Promise<AutoApplyRun | null> | null = null;
  private lastRun: AutoApplyRun | null = null;
  private pendingApproval: PendingApproval | null = null;
  private waitingData: Array<{ id: string; name: string; status: SignatureStatusEnum }> = [];

  constructor(
    private readonly directoryService: DirectoryService,
    private readonly signaturesService: SignaturesService,
    private readonly applicationsService: SignatureApplicationsService,
    private readonly settingsService: SettingsService,
    private readonly credentials: GoogleCredentialsService,
  ) {}

  onModuleInit(): void {
    this.directoryService.onSynced(async () => {
      await this.run('SYNC');
    });
  }

  /** Uma execução por vez: quem chamar durante uma execução recebe o resultado dela. */
  run(origin: AutoApplyRun['origin']): Promise<AutoApplyRun | null> {
    if (this.current) return this.current;
    this.current = this.execute(origin).finally(() => (this.current = null));
    return this.current;
  }

  /** Entradas recentes no AD: criados nos últimos `days` dias e se já receberam assinatura. */
  async recentEntries(days: number) {
    const since = Date.now() - days * 86_400_000;
    const [renders, index] = await Promise.all([this.signaturesService.renderAll(), this.applicationsService.writeIndex()]);
    return renders
      .filter((r) => r.collaborator.createdAt && new Date(r.collaborator.createdAt).getTime() >= since)
      .sort((a, b) => (b.collaborator.createdAt ?? '').localeCompare(a.collaborator.createdAt ?? ''))
      .map((r) => {
        const entry = index.get(r.collaborator.id);
        return {
          id: r.collaborator.id,
          name: r.collaborator.name,
          email: r.collaborator.email,
          team: r.collaborator.team,
          area: r.collaborator.area,
          createdAt: r.collaborator.createdAt,
          signatureStatus: r.status,
          received: entry?.received ?? false,
          lastWriteAt: entry?.lastWrite?.at.toISOString() ?? null,
          lastFailureAt: entry?.lastFailureAt?.toISOString() ?? null,
        };
      });
  }

  private async execute(origin: AutoApplyRun['origin']): Promise<AutoApplyRun | null> {
    this.running = true;
    const base = { at: new Date().toISOString(), origin, newcomers: 0, changes: 0, waitingData: 0, retryLater: 0, batchIds: [] as string[] };
    try {
      const settings = await this.settingsService.findOne(SettingKeyEnum.AUTO_APPLY);
      if (!settings.enabled) {
        this.pendingApproval = null;
        this.waitingData = [];
        return (this.lastRun = { ...base, outcome: 'OFF', message: 'Automação desligada.' });
      }
      const delegation = await this.credentials.checkDelegation();
      if (delegation.status !== 'AUTHORIZED') {
        return (this.lastRun = { ...base, outcome: 'GOOGLE_NOT_READY', message: `Google não autorizado: ${delegation.error ?? delegation.status}` });
      }

      const [renders, index] = await Promise.all([this.signaturesService.renderAll(), this.applicationsService.writeIndex()]);
      const people = renders.map((r) => ({ id: r.collaborator.id, name: r.collaborator.name, createdAt: r.collaborator.createdAt, status: r.status, html: r.html }));
      const plan = AutoApplyPlanner.plan(people, index, settings, new Date());
      this.waitingData = plan.waitingData;
      const counts = { newcomers: plan.newcomers.length, changes: plan.changes.length, waitingData: plan.waitingData.length, retryLater: plan.retryLater };
      const total = plan.newcomers.length + plan.changes.length;

      if (!total) {
        this.pendingApproval = null;
        return (this.lastRun = { ...base, ...counts, outcome: 'NOTHING', message: 'Nada novo para gravar.' });
      }
      if (total > settings.maxPerRun) {
        this.pendingApproval = { detectedAt: base.at, newcomers: plan.newcomers, changes: plan.changes };
        return (this.lastRun = {
          ...base,
          ...counts,
          outcome: 'WAITING_APPROVAL',
          message: `${total} gravações de uma vez (limite ${settings.maxPerRun}): aguardando aprovação.`,
        });
      }

      this.pendingApproval = null;
      const batchIds = await this.startBatches(plan.newcomers, plan.changes, settings.includePending);
      this.logger.log(`Automação: ${plan.newcomers.length} novos e ${plan.changes.length} mudanças enviados para gravação.`);
      return (this.lastRun = { ...base, ...counts, batchIds, outcome: 'STARTED', message: `${total} gravações iniciadas.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Automação falhou: ${message}`);
      return (this.lastRun = { ...base, outcome: 'ERROR', message });
    } finally {
      this.running = false;
    }
  }

  /** Grava o que ficou acima do limite, depois que alguém conferiu no Monitoramento. */
  async approve(): Promise<AutoApplyRun> {
    if (!this.pendingApproval) {
      throw new BusinessException('AUTOMATION_NOTHING_TO_APPROVE', 'Não há gravações aguardando aprovação.', HttpStatus.CONFLICT);
    }
    const settings = await this.settingsService.findOne(SettingKeyEnum.AUTO_APPLY);
    const { newcomers, changes } = this.pendingApproval;
    this.pendingApproval = null;
    const batchIds = await this.startBatches(newcomers, changes, settings.includePending);
    return (this.lastRun = {
      at: new Date().toISOString(),
      origin: 'MANUAL',
      outcome: 'STARTED',
      message: `Aprovado: ${newcomers.length + changes.length} gravações iniciadas.`,
      newcomers: newcomers.length,
      changes: changes.length,
      waitingData: this.waitingData.length,
      retryLater: 0,
      batchIds,
    });
  }

  getState() {
    return {
      running: this.running,
      lastRun: this.lastRun,
      pendingApproval: this.pendingApproval
        ? { detectedAt: this.pendingApproval.detectedAt, newcomers: this.pendingApproval.newcomers.length, changes: this.pendingApproval.changes.length }
        : null,
      waitingData: this.waitingData.slice(0, 50),
    };
  }

  private async startBatches(newcomers: string[], changes: string[], includePending: boolean): Promise<string[]> {
    const ids: string[] = [];
    if (newcomers.length) ids.push((await this.applicationsService.startBatch({ collaboratorIds: newcomers, includePending }, 'AUTO_NEW')).id);
    if (changes.length) ids.push((await this.applicationsService.startBatch({ collaboratorIds: changes, includePending }, 'AUTO_CHANGE')).id);
    return ids;
  }
}
