import { TextHelper } from '../../common/helpers/text.helper.js';

/** Variáveis disponíveis nos modelos (o que o admin vê na tela). */
export const TEMPLATE_VARIABLES: Array<{ key: string; description: string }> = [
  { key: 'nome', description: 'Nome de exibição do AD' },
  { key: 'email', description: 'E-mail' },
  { key: 'cargo', description: 'Cargo como está no AD' },
  { key: 'setor', description: 'Área ou time, conforme a regra' },
  { key: 'area', description: 'Área (sempre)' },
  { key: 'time', description: 'Time (sempre)' },
  { key: 'contato', description: 'Celular formatado ou "Ramal 1234"' },
  { key: 'contato_celular', description: 'Preenchido só quando o contato é celular' },
  { key: 'contato_ramal', description: 'Preenchido só quando o contato é ramal' },
  { key: 'frase', description: 'Frase definida pela regra' },
  { key: 'telefone_0800', description: '0800 definido pela regra' },
  { key: 'img', description: 'Endereço base das imagens (termina com /)' },
];

const SECTION = /\{\{([#^])\s*([\w]+)\s*\}\}([\s\S]*?)\{\{\/\s*\2\s*\}\}/g;
const VARIABLE = /\{\{\s*([\w]+)\s*\}\}/g;

/**
 * Mini-linguagem de modelo (subconjunto do Mustache):
 * - {{nome}} → valor com HTML escapado (texto do AD nunca vira HTML);
 * - {{#frase}}…{{/frase}} → só aparece se a variável tiver valor;
 * - {{^frase}}…{{/frase}} → só aparece se a variável estiver vazia.
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

  /** Problemas que impedem salvar o modelo (marcação desbalanceada, variável desconhecida). */
  static validate(template: string): string[] {
    const problems: string[] = [];
    const known = new Set(TEMPLATE_VARIABLES.map((v) => v.key));
    const opened: string[] = [];
    for (const match of template.matchAll(/\{\{\s*([#^/]?)\s*([\w]+)\s*\}\}/g)) {
      const [, kind, key] = match;
      if (!known.has(key)) problems.push(`Variável desconhecida: {{${kind}${key}}}.`);
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
