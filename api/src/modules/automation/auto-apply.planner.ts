import { AutoApply } from '../settings/types/settings-values.js';
import type { WriteIndexEntry } from '../signature-applications/signature-applications.service.js';
import { ApplicationStatusEnum } from '../signature-applications/types/application-status.enum.js';
import { SignatureStatusEnum } from '../signatures/types/signature-status.enum.js';

export interface PlannerPerson {
  id: string;
  name: string;
  createdAt: string | null;
  status: SignatureStatusEnum;
  html: string;
}

export interface AutoApplyPlan {
  /** Criados no AD depois de ligar a automação, nunca receberam e estão prontos. */
  newcomers: string[];
  /** Já receberam do sistema e a assinatura gerada mudou. */
  changes: string[];
  /** Novos que ainda não podem receber (pendente, conflito, sem regra). */
  waitingData: Array<{ id: string; name: string; status: SignatureStatusEnum }>;
  /** Falharam há pouco (ex.: conta Google ainda não existe): tentam de novo depois. */
  retryLater: number;
}

const RETRY_AFTER_MS = 60 * 60_000;

/** Decide, a cada leitura do AD, quem recebe gravação automática. Sem I/O. */
export class AutoApplyPlanner {
  static plan(people: PlannerPerson[], index: Map<string, WriteIndexEntry>, settings: AutoApply, now: Date): AutoApplyPlan {
    const plan: AutoApplyPlan = { newcomers: [], changes: [], waitingData: [], retryLater: 0 };
    if (!settings.enabled) return plan;
    const cutoff = settings.enabledAt ? new Date(settings.enabledAt).getTime() : Number.POSITIVE_INFINITY;
    const allowed = (s: SignatureStatusEnum) =>
      s === SignatureStatusEnum.READY || (s === SignatureStatusEnum.PENDING && settings.includePending);

    for (const person of people) {
      const entry = index.get(person.id);
      const failedRecently = Boolean(entry?.lastFailureAt && now.getTime() - entry.lastFailureAt.getTime() < RETRY_AFTER_MS);
      const created = person.createdAt ? new Date(person.createdAt).getTime() : Number.NEGATIVE_INFINITY;

      const isNewcomer = settings.newCollaborators && created >= cutoff && !entry?.received;
      if (isNewcomer) {
        if (!allowed(person.status)) plan.waitingData.push({ id: person.id, name: person.name, status: person.status });
        else if (failedRecently) plan.retryLater++;
        else plan.newcomers.push(person.id);
        continue;
      }

      // Quem desfez (última escrita = RESTORED) não é regravado sozinho.
      const lastWrite = entry?.lastWrite;
      const changed =
        settings.changes && lastWrite?.status === ApplicationStatusEnum.APPLIED && lastWrite.renderedSignature !== person.html;
      if (changed && allowed(person.status)) {
        if (failedRecently) plan.retryLater++;
        else plan.changes.push(person.id);
      }
    }
    return plan;
  }
}
