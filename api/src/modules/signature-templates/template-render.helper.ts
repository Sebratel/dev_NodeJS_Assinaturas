import { TextHelper } from '../../common/helpers/text.helper.js';

/**
 * Variáveis disponíveis nos modelos (o que o admin vê na tela).
 * `overridable`: uma regra pode esconder ou trocar o valor (tela Regras › Variáveis do modelo).
 */
export const TEMPLATE_VARIABLES: Array<{ key: string; description: string; overridable: boolean }> = [
  { key: 'nome', description: 'Nome de exibição do AD', overridable: true },
  { key: 'email', description: 'E-mail', overridable: true },
  { key: 'cargo', description: 'Cargo como está no AD', overridable: true },
  { key: 'setor', description: 'Área ou time, conforme a regra', overridable: true },
  { key: 'area', description: 'Área (sempre)', overridable: true },
  { key: 'time', description: 'Time (sempre)', overridable: true },
  { key: 'contato', description: 'Celular formatado ou "Ramal 1234"', overridable: true },
  { key: 'contato_celular', description: 'Preenchido só quando o contato é celular', overridable: true },
  { key: 'contato_ramal', description: 'Preenchido só quando o contato é ramal', overridable: true },
  { key: 'frase', description: 'Frase definida pela regra', overridable: true },
  { key: 'telefone_0800', description: '0800 definido pela regra', overridable: true },
  { key: 'empresa', description: 'Empresa no AD (company)', overridable: true },
  { key: 'departamento', description: 'Departamento no AD', overridable: true },
  { key: 'segmento', description: 'Segmento no AD', overridable: true },
  { key: 'estado', description: 'Estado (UF) no AD', overridable: true },
  { key: 'escritorio', description: 'Escritório no AD', overridable: true },
  { key: 'img', description: 'Endereço base das imagens (termina com /)', overridable: false },
];

export const OVERRIDABLE_VARIABLE_KEYS = TEMPLATE_VARIABLES.filter((v) => v.overridable).map((v) => v.key);

const SECTION = /\{\{([#^])\s*([\w]+)\s*\}\}([\s\S]*?)\{\{\/\s*\2\s*\}\}/g;
const VARIABLE = /\{\{\s*([\w]+)\s*\}\}/g;
const ANY_TAG = /\{\{\s*([#^/]?)\s*([\w]+)\s*\}\}/g;

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

  /**
   * Texto de uma regra que troca uma variável ("{{time}} · Sebratel Empresas").
   * Sai como texto puro, sem escapar: o escape acontece quando o resultado entra no modelo.
   * Espaços que sobram de variável vazia são recolhidos.
   */
  static renderText(text: string, variables: Record<string, string>): string {
    return text
      .replace(VARIABLE, (_match, key: string) => variables[key] ?? '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  /** Problemas no texto de uma regra que troca variável: só {{variavel}} conhecida, sem blocos. */
  static validateText(text: string): string[] {
    const problems: string[] = [];
    const known = new Set(TEMPLATE_VARIABLES.map((v) => v.key));
    for (const [, kind, key] of text.matchAll(ANY_TAG)) {
      if (kind) problems.push(`Blocos ({{${kind}${key}}}) não valem aqui; use só {{variavel}}.`);
      else if (!known.has(key)) problems.push(`Variável desconhecida: {{${key}}}.`);
    }
    return [...new Set(problems)];
  }

  /** Problemas que impedem salvar o modelo (marcação desbalanceada, variável desconhecida). */
  static validate(template: string): string[] {
    const problems: string[] = [];
    const known = new Set(TEMPLATE_VARIABLES.map((v) => v.key));
    const opened: string[] = [];
    for (const match of template.matchAll(ANY_TAG)) {
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
