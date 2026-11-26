import { RuleOutputs, RuleVariable } from './types/signature-rule.types.js';
import { VariableSourceEnum } from './types/variable-source.enum.js';

/**
 * Formato das regras gravadas até a 1.6.0: partes fixas (0800, contato, "antes do cargo", frase).
 * Continua no banco até alguém salvar a regra de novo; a leitura converte para variáveis.
 */
interface LegacyRuleOutputs {
  phone0800Mode?: 'DIRECTORY' | 'FIXED' | null;
  phone0800?: string | null;
  contact?: 'NONE' | 'CORPORATE_MOBILE' | 'INFORMED_MOBILE' | 'EXTENSION' | null;
  sectorLabel?: 'AREA' | 'TEAM' | 'NONE' | null;
  phraseMode?: 'TEAM' | 'FIXED' | 'NONE' | null;
  phraseText?: string | null;
  templateId?: string | null;
  /** 1.7.0 (só staging) usava `mode` HIDE | TEXT. */
  variables?: Array<Partial<RuleVariable> & { key: string; mode?: 'HIDE' | 'TEXT' }> | null;
}

const field = (key: string, fieldKey: string, prefix: string | null = null): RuleVariable => ({
  key,
  source: VariableSourceEnum.FIELD,
  field: fieldKey,
  prefix,
  text: null,
});
const text = (key: string, value: string): RuleVariable => ({ key, source: VariableSourceEnum.TEXT, field: null, text: value });
const empty = (key: string): RuleVariable => ({ key, source: VariableSourceEnum.EMPTY, field: null, text: null });

/** Traduz o que está gravado (formato antigo ou novo) para o formato de variáveis. */
export class RuleOutputsHelper {
  static normalize(raw: unknown): RuleOutputs {
    const o = (raw ?? {}) as LegacyRuleOutputs;
    const byKey = new Map<string, RuleVariable>();
    const put = (variable: RuleVariable) => byKey.set(variable.key, variable);

    const phoneMode = o.phone0800Mode ?? (o.phone0800 ? 'FIXED' : null);
    if (phoneMode === 'DIRECTORY') put(field('telefone_0800', 'telefone_0800'));
    if (phoneMode === 'FIXED') put(text('telefone_0800', o.phone0800 ?? ''));

    if (o.contact === 'NONE') ['contato', 'contato_celular', 'contato_ramal'].forEach((k) => put(empty(k)));
    if (o.contact === 'CORPORATE_MOBILE' || o.contact === 'INFORMED_MOBILE') {
      const mobile = o.contact === 'CORPORATE_MOBILE' ? 'celular_corporativo' : 'celular_informado';
      put(field('contato', mobile));
      put(field('contato_celular', mobile));
      put(empty('contato_ramal'));
    }
    if (o.contact === 'EXTENSION') {
      put(field('contato', 'ramal', 'Ramal'));
      put(empty('contato_celular'));
      put(field('contato_ramal', 'ramal', 'Ramal'));
    }

    if (o.sectorLabel === 'AREA') put(field('setor', 'area'));
    if (o.sectorLabel === 'TEAM') put(field('setor', 'time'));
    if (o.sectorLabel === 'NONE') put(empty('setor'));

    if (o.phraseMode === 'TEAM') put(field('frase', 'frase'));
    if (o.phraseMode === 'FIXED') put(text('frase', o.phraseText ?? ''));
    if (o.phraseMode === 'NONE') put(empty('frase'));

    // Formato novo vence o antigo na mesma variável.
    for (const v of o.variables ?? []) {
      if (!v?.key) continue;
      const source = v.source ?? (v.mode === 'HIDE' ? VariableSourceEnum.EMPTY : VariableSourceEnum.TEXT);
      put({
        key: v.key,
        source,
        field: source === VariableSourceEnum.FIELD ? (v.field ?? null) : null,
        prefix: source === VariableSourceEnum.FIELD ? (v.prefix ?? null) : null,
        text: source === VariableSourceEnum.TEXT ? (v.text ?? '') : null,
      });
    }

    return { templateId: o.templateId ?? null, variables: byKey.size ? [...byKey.values()] : null };
  }
}
