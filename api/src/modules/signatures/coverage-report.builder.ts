import { Collaborator } from '../directory/types/collaborator.js';
import { ContactTypeEnum } from '../signature-rules/types/contact-type.enum.js';
import { SignatureRule } from '../signature-rules/types/signature-rule.types.js';
import { CoverageReport, PersonSample } from './types/coverage-report.types.js';
import { SignatureEvaluation } from './types/signature-evaluation.types.js';
import { SignatureIssueCodeEnum } from './types/signature-issue-code.enum.js';
import { SignatureStatusEnum } from './types/signature-status.enum.js';

const SAMPLE_SIZE = 8;

/** Junta as avaliações individuais no relatório de cobertura (quem cada regra pega, pendências, conflitos). */
export class CoverageReportBuilder {
  static emptyStatusCount(): Record<SignatureStatusEnum, number> {
    return Object.fromEntries(Object.values(SignatureStatusEnum).map((s) => [s, 0])) as Record<SignatureStatusEnum, number>;
  }

  static countByStatus(evaluations: SignatureEvaluation[]): Record<SignatureStatusEnum, number> {
    const count = CoverageReportBuilder.emptyStatusCount();
    evaluations.forEach((e) => count[e.status]++);
    return count;
  }

  static sample(person: Collaborator): PersonSample {
    return { id: person.id, name: person.name, team: person.team, level: person.level };
  }

  /** Quantas pessoas têm pelo menos uma parte da assinatura decidida por esta regra. */
  static winsOf(ruleId: string, evaluations: SignatureEvaluation[]): number {
    return evaluations.filter((e) => Object.values(e.decisions).some((d) => d?.ruleId === ruleId)).length;
  }

  static build(collaborators: Collaborator[], evaluations: SignatureEvaluation[], rules: SignatureRule[]): CoverageReport {
    const byId = new Map(collaborators.map((c) => [c.id, c]));
    const byContact = Object.fromEntries(Object.values(ContactTypeEnum).map((t) => [t, 0])) as Record<ContactTypeEnum, number>;
    const issues = new Map<SignatureIssueCodeEnum, CoverageReport['issues'][number]>();
    const conflicts = new Map<string, CoverageReport['conflicts'][number]>();
    const onlyGeneral = new Map<string, CoverageReport['groupsOnlyGeneral'][number]>();
    let onlyGeneralRules = 0;

    for (const evaluation of evaluations) {
      const person = byId.get(evaluation.collaboratorId);
      if (!person) continue;
      byContact[evaluation.content.contactType]++;

      for (const issue of evaluation.issues) {
        const entry = issues.get(issue.code) ?? { code: issue.code, severity: issue.severity, count: 0, sample: [] };
        entry.count++;
        if (entry.sample.length < SAMPLE_SIZE) entry.sample.push(CoverageReportBuilder.sample(person));
        issues.set(issue.code, entry);
      }

      for (const conflict of evaluation.conflicts) {
        const key = `${conflict.slot}|${conflict.ruleNames.join('|')}`;
        const entry = conflicts.get(key) ?? { slot: conflict.slot, ruleNames: conflict.ruleNames, count: 0, sample: [] };
        entry.count++;
        if (entry.sample.length < SAMPLE_SIZE) entry.sample.push(CoverageReportBuilder.sample(person));
        conflicts.set(key, entry);
      }

      if (evaluation.matchedRules.length && evaluation.matchedRules.every((r) => r.general)) {
        onlyGeneralRules++;
        const key = `${person.area}|${person.team}|${person.level}`;
        const entry = onlyGeneral.get(key) ?? { area: person.area, team: person.team, level: person.level, count: 0 };
        entry.count++;
        onlyGeneral.set(key, entry);
      }
    }

    return {
      generatedAt: new Date().toISOString(),
      totalCollaborators: collaborators.length,
      byStatus: CoverageReportBuilder.countByStatus(evaluations),
      byContact,
      onlyGeneralRules,
      issues: [...issues.values()].sort((a, b) => b.count - a.count),
      rules: rules.map((rule) => ({
        id: rule.id,
        name: rule.name,
        priority: rule.priority,
        active: rule.active,
        matched: evaluations.filter((e) => e.matchedRules.some((m) => m.id === rule.id)).length,
        wins: CoverageReportBuilder.winsOf(rule.id, evaluations),
      })),
      conflicts: [...conflicts.values()].sort((a, b) => b.count - a.count),
      groupsOnlyGeneral: [...onlyGeneral.values()].sort((a, b) => b.count - a.count).slice(0, 40),
      phraseOrigins: evaluations.reduce((acc, e) => ((acc[e.phraseOrigin.kind] += 1), acc), {
        PROFILE: 0,
        TEAM: 0,
        DEFAULT: 0,
        FIXED: 0,
        NONE: 0,
      } as CoverageReport['phraseOrigins']),
      phraseProfiles: [],
    };
  }
}
