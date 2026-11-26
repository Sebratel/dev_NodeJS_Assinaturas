import { Injectable } from '@nestjs/common';
import { TextHelper } from '../../common/helpers/text.helper.js';
import { Collaborator } from '../directory/types/collaborator.js';
import { PhraseProfile } from '../phrase-profiles/types/phrase-profile.types.js';
import { TeamPhrases } from '../settings/types/settings-values.js';
import { RuleOperatorEnum } from '../signature-rules/types/rule-operator.enum.js';
import { RuleCondition, RuleVariable, SignatureRule } from '../signature-rules/types/signature-rule.types.js';
import { VariableSourceEnum } from '../signature-rules/types/variable-source.enum.js';
import { SignatureFieldsHelper } from '../signature-templates/signature-fields.js';
import { SignatureIssueCodeEnum } from './types/signature-issue-code.enum.js';
import { SignatureStatusEnum } from './types/signature-status.enum.js';
import {
  DecisionSlot,
  PhraseOrigin,
  SignatureConflict,
  SignatureDecisions,
  SignatureEvaluation,
  SignatureIssue,
  SlotDecision,
  VariableChoice,
} from './types/signature-evaluation.types.js';

/**
 * Motor em cascata: todas as regras ativas que casam se aplicam em ordem de prioridade (menor → maior).
 * O modelo e cada variável do modelo ficam com a regra de maior prioridade que os definiu.
 * Variável que nenhuma regra decide mostra o campo de mesmo nome ({{cargo}} → Cargo) ou fica vazia.
 * Empate de prioridade com valores diferentes no que venceu = conflito.
 * Sem estado e sem I/O: recebe tudo por parâmetro.
 */
@Injectable()
export class SignatureEngineService {
  evaluate(collaborator: Collaborator, rules: SignatureRule[], phrases: TeamPhrases, profiles: PhraseProfile[] = []): SignatureEvaluation {
    const matched = rules
      .filter((rule) => rule.active && this.matches(collaborator, rule))
      .sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name, 'pt-BR'));

    const decisions: SignatureDecisions = { template: null, variables: {} };
    const ties: Array<SignatureConflict & { priority: number }> = [];

    for (const rule of matched) {
      const proposals: Array<[DecisionSlot, unknown]> = [
        ['template', rule.outputs.templateId || null],
        ...(rule.outputs.variables ?? []).map((v): [DecisionSlot, VariableChoice] => [`var:${v.key}`, SignatureEngineService.choiceOf(v)]),
      ];
      for (const [slot, value] of proposals) {
        if (value === null) continue;
        const current = SignatureEngineService.decisionOf(decisions, slot);
        if (current && current.priority === rule.priority && JSON.stringify(current.value) !== JSON.stringify(value)) {
          ties.push({ slot, ruleNames: [current.ruleName, rule.name], priority: rule.priority });
        }
        SignatureEngineService.setDecision(decisions, slot, { value, ruleId: rule.id, ruleName: rule.name, priority: rule.priority });
      }
    }

    // Empate só importa se nenhuma regra de prioridade maior decidiu a mesma parte depois.
    const conflicts = this.mergeTies(ties.filter((t) => SignatureEngineService.decisionOf(decisions, t.slot)?.priority === t.priority));
    const phrase = this.resolvePhrase(collaborator, phrases, profiles);
    const fields = SignatureFieldsHelper.values(collaborator, { phrase: phrase.text });
    const values: Record<string, string> = { ...fields };
    for (const key of ['setor', 'contato', 'contato_celular', 'contato_ramal'])
      values[key] = SignatureFieldsHelper.defaultValue(key, fields);
    for (const [key, decision] of Object.entries(decisions.variables)) values[key] = SignatureEngineService.valueOf(decision.value, fields);

    const fieldsUsed = [...new Set(Object.values(decisions.variables).flatMap((d) => SignatureEngineService.fieldsOf(d.value)))];
    const phraseOrigin = this.phraseOriginOf(decisions.variables.frase, phrase.origin);
    const issues = this.collectIssues(matched, decisions, conflicts, collaborator, fields, phraseOrigin);

    let status = SignatureStatusEnum.READY;
    if (!matched.length) status = SignatureStatusEnum.NO_RULE;
    else if (conflicts.length) status = SignatureStatusEnum.CONFLICT;
    else if (issues.some((i) => i.severity === 'ERROR')) status = SignatureStatusEnum.PENDING;

    return {
      collaboratorId: collaborator.id,
      status,
      phraseOrigin,
      matchedRules: matched.map((r) => ({ id: r.id, name: r.name, priority: r.priority, general: r.conditions.length === 0 })),
      decisions,
      conflicts,
      issues,
      content: { values, fieldsUsed },
    };
  }

  matches(collaborator: Collaborator, rule: Pick<SignatureRule, 'conditions'>): boolean {
    return rule.conditions.every((condition) => this.conditionMatches(collaborator, condition));
  }

  /** Decisão do modelo ou de uma variável (`var:cargo`). */
  static decisionOf(decisions: SignatureDecisions, slot: DecisionSlot): SlotDecision<unknown> | null {
    return slot === 'template' ? decisions.template : (decisions.variables[slot.slice(4)] ?? null);
  }

  /** Partes que a regra venceu: 'template' e/ou `var:<variável>`. */
  static slotsDecidedBy(decisions: SignatureDecisions, ruleId: string): DecisionSlot[] {
    return [
      ...(decisions.template?.ruleId === ruleId ? (['template'] as DecisionSlot[]) : []),
      ...Object.entries(decisions.variables)
        .filter(([, decision]) => decision.ruleId === ruleId)
        .map(([key]): DecisionSlot => `var:${key}`),
    ];
  }

  private static setDecision(decisions: SignatureDecisions, slot: DecisionSlot, decision: SlotDecision<unknown>): void {
    if (slot === 'template') decisions.template = decision as SlotDecision<string>;
    else decisions.variables[slot.slice(4)] = decision as SlotDecision<VariableChoice>;
  }

  private static choiceOf(variable: RuleVariable): VariableChoice {
    return {
      source: variable.source,
      field: variable.source === VariableSourceEnum.FIELD ? (variable.field ?? null) : null,
      text: variable.source === VariableSourceEnum.TEXT ? (variable.text ?? '') : null,
    };
  }

  private static valueOf(choice: VariableChoice, fields: Record<string, string>): string {
    if (choice.source === VariableSourceEnum.FIELD) return fields[choice.field ?? ''] ?? '';
    if (choice.source === VariableSourceEnum.TEXT) return SignatureFieldsHelper.renderText(choice.text ?? '', fields);
    return '';
  }

  private static fieldsOf(choice: VariableChoice): string[] {
    if (choice.source === VariableSourceEnum.FIELD) return choice.field ? [choice.field] : [];
    if (choice.source === VariableSourceEnum.TEXT) return SignatureFieldsHelper.fieldsIn(choice.text ?? '');
    return [];
  }

  private conditionMatches(collaborator: Collaborator, condition: RuleCondition): boolean {
    const value = TextHelper.normalize(collaborator[condition.field]);
    const values = condition.values.map((v) => TextHelper.normalize(v)).filter(Boolean);
    switch (condition.operator) {
      case RuleOperatorEnum.IN:
        return values.includes(value);
      case RuleOperatorEnum.NOT_IN:
        return !values.includes(value);
      case RuleOperatorEnum.CONTAINS:
        return values.some((v) => value.includes(v));
      case RuleOperatorEnum.IS_EMPTY:
        return value === '';
      case RuleOperatorEnum.IS_NOT_EMPTY:
        return value !== '';
      default:
        return false;
    }
  }

  private mergeTies(ties: Array<SignatureConflict & { priority: number }>): SignatureConflict[] {
    const bySlot = new Map<DecisionSlot, Set<string>>();
    for (const tie of ties) {
      const names = bySlot.get(tie.slot) ?? new Set<string>();
      tie.ruleNames.forEach((n) => names.add(n));
      bySlot.set(tie.slot, names);
    }
    return [...bySlot.entries()].map(([slot, names]) => ({ slot, ruleNames: [...names].sort((a, b) => a.localeCompare(b, 'pt-BR')) }));
  }

  /**
   * Frase da tela Frases para a pessoa: perfil de frase que casa (prioridade maior; empate: mais condições, depois nome)
   * › frase do time › frase padrão. Só aparece na assinatura se a variável {{frase}} (ou outra) usar o campo Frase.
   */
  private resolvePhrase(
    collaborator: Collaborator,
    phrases: TeamPhrases,
    profiles: PhraseProfile[],
  ): { text: string; origin: PhraseOrigin } {
    const profile = this.pickProfile(collaborator, profiles);
    if (profile) return { text: profile.phrase, origin: { kind: 'PROFILE', label: profile.name, id: profile.id } };
    const team = this.teamPhrase(collaborator, phrases);
    if (team)
      return { text: team, origin: { kind: 'TEAM', label: [collaborator.team, collaborator.area].filter(Boolean).join(' · '), id: null } };
    return { text: phrases.defaultPhrase, origin: { kind: 'DEFAULT', label: 'Frase padrão', id: null } };
  }

  /** De onde saiu o que está em {{frase}}: a tela Frases, uma regra (texto ou outro campo) ou nada. */
  private phraseOriginOf(decision: SlotDecision<VariableChoice> | undefined, fromScreen: PhraseOrigin): PhraseOrigin {
    if (!decision) return fromScreen;
    const { source, field } = decision.value;
    if (source === VariableSourceEnum.FIELD && field === 'frase') return fromScreen;
    if (source === VariableSourceEnum.EMPTY) return { kind: 'NONE', label: 'Sem frase', id: null };
    return { kind: 'FIXED', label: decision.ruleName, id: null };
  }

  pickProfile(collaborator: Collaborator, profiles: PhraseProfile[]): PhraseProfile | null {
    return (
      profiles
        .filter((p) => p.active && p.phrase.trim() && this.matches(collaborator, p))
        .sort((a, b) => b.priority - a.priority || b.conditions.length - a.conditions.length || a.name.localeCompare(b.name, 'pt-BR'))[0] ??
      null
    );
  }

  /** Frase da área + time; se não houver, a do time sem área definida. */
  private teamPhrase(collaborator: Collaborator, phrases: TeamPhrases): string | null {
    const team = TextHelper.normalize(collaborator.team);
    const area = TextHelper.normalize(collaborator.area);
    const candidates = phrases.byTeam.filter((p) => TextHelper.normalize(p.team) === team && p.phrase.trim());
    const exact = candidates.find((p) => p.area && TextHelper.normalize(p.area) === area);
    return (exact ?? candidates.find((p) => !p.area?.trim()))?.phrase ?? null;
  }

  private collectIssues(
    matched: SignatureRule[],
    decisions: SignatureDecisions,
    conflicts: SignatureConflict[],
    collaborator: Collaborator,
    fields: Record<string, string>,
    phraseOrigin: PhraseOrigin,
  ): SignatureIssue[] {
    const issues: SignatureIssue[] = [];
    if (!matched.length) {
      issues.push({ code: SignatureIssueCodeEnum.NO_RULE, severity: 'ERROR', message: 'Nenhuma regra ativa vale para esta pessoa.' });
      return issues;
    }
    for (const conflict of conflicts) {
      issues.push({
        code: SignatureIssueCodeEnum.RULE_CONFLICT,
        severity: 'ERROR',
        message: `Empate em "${slotLabel(conflict.slot)}": ${conflict.ruleNames.join(' × ')}. Ajuste a prioridade de uma delas.`,
      });
    }
    // Campo escolhido por regra (direto ou dentro de um texto) e vazio na pessoa: celular, ramal, 0800.
    const missing = new Map<SignatureIssueCodeEnum, SignatureIssue>();
    for (const decision of Object.values(decisions.variables)) {
      for (const key of SignatureEngineService.fieldsOf(decision.value)) {
        const issue = SignatureFieldsHelper.missingIssue(key, collaborator, fields);
        if (issue && !missing.has(issue.code)) missing.set(issue.code, { ...issue, severity: 'ERROR' });
      }
    }
    issues.push(...missing.values());
    if (matched.every((r) => r.conditions.length === 0)) {
      issues.push({
        code: SignatureIssueCodeEnum.ONLY_GENERAL_RULES,
        severity: 'INFO',
        message: 'Só a regra geral vale para esta pessoa.',
      });
    }
    if (phraseOrigin.kind === 'DEFAULT') {
      issues.push({
        code: SignatureIssueCodeEnum.DEFAULT_PHRASE,
        severity: 'INFO',
        message: 'Nenhum perfil nem o time têm frase: usa a frase padrão.',
      });
    }
    return issues;
  }
}

/** "Modelo" ou "{{cargo}}" para variável do modelo. */
export function slotLabel(slot: DecisionSlot): string {
  return slot === 'template' ? 'Modelo' : `{{${slot.slice(4)}}}`;
}
