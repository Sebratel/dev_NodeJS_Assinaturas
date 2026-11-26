import { TextHelper } from '../../common/helpers/text.helper.js';

/** Variável técnica: endereço base das imagens (termina com /). Não aparece nas regras. */
export const IMAGE_VARIABLE = 'img';

const SECTION = /\{\{([#^])\s*(\w+)\s*\}\}([\s\S]*?)\{\{\/\s*\2\s*\}\}/g;
const VARIABLE = /\{\{\s*(\w+)\s*\}\}/g;
const ANY_TAG = /\{\{\s*([#^/]?)\s*(\w+)\s*\}\}/g;

/**
 * Mini-linguagem de modelo (subconjunto do Mustache):
 * - {{nome}} → valor com HTML escapado (texto do AD nunca vira HTML);
 * - {{#frase}}…{{/frase}} → só aparece se a variável tiver valor;
 * - {{^frase}}…{{/frase}} → só aparece se a variável estiver vazia.
 * Qualquer nome vale ({{teste}}): cada variável do modelo vira um campo nas regras.
 */
export class TemplateRenderHelper {
  static render(template: string, variables: Record<string, string>): string {
    let output = template;
    for (let guard = 0; guard < 10; guard++) {
      const next = output.replace(SECTION, (_match, kind: string, key: string, inner: string) => {
        const filled = Boolean(variables[key]?.trim());
        return (kind === '#' ? filled : !filled) ? inner : '';
      });
      if (next === output) break;
      output = next;
    }
    return output.replace(VARIABLE, (_match, key: string) => TextHelper.escapeHtml(variables[key] ?? ''));
  }

  /** Variáveis que o modelo usa (inclusive em blocos), na ordem em que aparecem, sem {{img}}. */
  static variablesOf(template: string): string[] {
    return [...new Set([...template.matchAll(ANY_TAG)].map((m) => m[2]))].filter((key) => key !== IMAGE_VARIABLE);
  }

  /** Problemas que impedem salvar o modelo (marcação desbalanceada, script). */
  static validate(template: string): string[] {
    const problems: string[] = [];
    const opened: string[] = [];
    for (const [, kind, key] of template.matchAll(ANY_TAG)) {
      if (kind === '#' || kind === '^') opened.push(key);
      if (kind === '/') {
        const last = opened.pop();
        if (last !== key) problems.push(`Bloco {{/${key}}} fecha ${last ? `{{#${last}}}` : 'nada'}.`);
      }
    }
    opened.forEach((key) => problems.push(`Bloco {{#${key}}} sem {{/${key}}}.`));
    if (/<script\b|\son\w+\s*=|javascript:/i.test(template))
      problems.push('Script e eventos (onclick etc.) não são permitidos: o Gmail remove e é risco.');
    return [...new Set(problems)];
  }
}
