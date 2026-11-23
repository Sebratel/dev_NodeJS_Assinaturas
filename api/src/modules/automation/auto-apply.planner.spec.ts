import { describe, expect, it } from 'vitest';
import type { WriteIndexEntry } from '../signature-applications/signature-applications.service.js';
import { ApplicationStatusEnum } from '../signature-applications/types/application-status.enum.js';
import { SignatureStatusEnum } from '../signatures/types/signature-status.enum.js';
import { AutoApplyPlanner, PlannerPerson } from './auto-apply.planner.js';

const now = new Date('2026-11-23T15:00:00Z');
const on = { enabled: true, newCollaborators: true, changes: true, includePending: false, maxPerRun: 30, enabledAt: '2026-11-23T12:00:00Z' };
const person = (id: string, createdAt: string, status = SignatureStatusEnum.READY, html = '<b>nova</b>'): PlannerPerson => ({ id, name: id, createdAt, status, html });
const entry = (partial: Partial<WriteIndexEntry>): WriteIndexEntry => ({ lastWrite: null, received: false, lastFailureAt: null, ...partial });

describe('AutoApplyPlanner', () => {
  it('desligada não grava ninguém', () => {
    const plan = AutoApplyPlanner.plan([person('a', '2026-11-23T13:00:00Z')], new Map(), { ...on, enabled: false }, now);
    expect(plan.newcomers).toEqual([]);
  });

  it('novo = criado no AD depois de ligar e nunca recebeu; antigo sem gravação não entra', () => {
    const plan = AutoApplyPlanner.plan([person('novo', '2026-11-23T13:00:00Z'), person('antigo', '2025-01-01T00:00:00Z')], new Map(), on, now);
    expect(plan.newcomers).toEqual(['novo']);
  });

  it('novo pendente fica aguardando dados (a não ser que "incluir pendentes" esteja ligado)', () => {
    const pendente = person('p', '2026-11-23T13:00:00Z', SignatureStatusEnum.PENDING);
    expect(AutoApplyPlanner.plan([pendente], new Map(), on, now)).toMatchObject({ newcomers: [], waitingData: [{ id: 'p' }] });
    expect(AutoApplyPlanner.plan([pendente], new Map(), { ...on, includePending: true }, now).newcomers).toEqual(['p']);
  });

  it('falhou há menos de 1 hora (ex.: conta Google ainda não existe): tenta depois', () => {
    const index = new Map([['n', entry({ lastFailureAt: new Date('2026-11-23T14:30:00Z') })]]);
    const plan = AutoApplyPlanner.plan([person('n', '2026-11-23T13:00:00Z')], index, on, now);
    expect(plan).toMatchObject({ newcomers: [], retryLater: 1 });
  });

  it('mudança: regrava quem já recebeu e cuja assinatura gerada mudou; igual não regrava', () => {
    const index = new Map([
      ['mudou', entry({ received: true, lastWrite: { status: ApplicationStatusEnum.APPLIED, renderedSignature: '<b>velha</b>', at: now } })],
      ['igual', entry({ received: true, lastWrite: { status: ApplicationStatusEnum.APPLIED, renderedSignature: '<b>nova</b>', at: now } })],
    ]);
    const plan = AutoApplyPlanner.plan([person('mudou', '2020-01-01T00:00:00Z'), person('igual', '2020-01-01T00:00:00Z')], index, on, now);
    expect(plan.changes).toEqual(['mudou']);
  });

  it('quem desfez (última escrita = RESTORED) não é regravado sozinho', () => {
    const index = new Map([['d', entry({ received: true, lastWrite: { status: ApplicationStatusEnum.RESTORED, renderedSignature: '<b>antiga</b>', at: now } })]]);
    expect(AutoApplyPlanner.plan([person('d', '2020-01-01T00:00:00Z')], index, on, now).changes).toEqual([]);
  });
});
