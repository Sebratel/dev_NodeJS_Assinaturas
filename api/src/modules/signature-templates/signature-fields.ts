import { TextHelper } from '../../common/helpers/text.helper.js';
import { Collaborator } from '../directory/types/collaborator.js';
import { SignatureIssueCodeEnum } from '../signatures/types/signature-issue-code.enum.js';

/** O que a tela mostra de cada campo (seletor da regra, botões do editor de modelo). */
export interface SignatureField {
  /** Também é o nome padrão da variável: {{cargo}} sem regra mostra o Cargo. */
  key: string;
  label: string;
  group: 'AD' | 'SISTEMA';
  description: string;
}

interface FieldContext {
  /** Frase da tela Frases para a pessoa (perfil › time › padrão). */
  phrase: string;
}

interface FieldDefinition extends SignatureField {
  read: (collaborator: Collaborator, context: FieldContext) => string;
  /** Campo que, escolhido por regra e vazio na pessoa, deixa a assinatura pendente. */
  missing?: (collaborator: Collaborator) => { code: SignatureIssueCodeEnum; message: string };
}

/** "08006551000" / "0800 655 1000" → "0800 655 1000"; outro formato → null. */
export function format0800(raw: string): string | null {
  const digits = String(raw ?? '').replace(/\D/g, '');
  return /^0800\d{7}$/.test(digits) ? `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}` : null;
}

const FIELDS: FieldDefinition[] = [
  { key: 'nome', label: 'Nome', group: 'AD', description: 'Nome de exibição', read: (c) => c.name },
  { key: 'email', label: 'E-mail', group: 'AD', description: 'E-mail da conta', read: (c) => c.email },
  { key: 'cargo', label: 'Cargo', group: 'AD', description: 'Cargo como está no AD', read: (c) => c.title },
  { key: 'area', label: 'Área', group: 'AD', description: 'Área', read: (c) => c.area },
  { key: 'time', label: 'Time', group: 'AD', description: 'Time', read: (c) => c.team },
  { key: 'departamento', label: 'Departamento', group: 'AD', description: 'Departamento', read: (c) => c.department },
  { key: 'empresa', label: 'Empresa', group: 'AD', description: 'Company', read: (c) => c.company },
  { key: 'segmento', label: 'Segmento', group: 'AD', description: 'Segmento', read: (c) => c.segment },
  { key: 'estado', label: 'Estado', group: 'AD', description: 'UF', read: (c) => c.state },
  { key: 'escritorio', label: 'Escritório', group: 'AD', description: 'Office', read: (c) => c.office },
  {
    key: 'celular_corporativo',
    label: 'Celular corporativo',
    group: 'AD',
    description: 'Celular da empresa, formatado',
    read: (c) => (c.corporateMobile ? TextHelper.formatPhone(c.corporateMobile) : ''),
    missing: () => ({ code: SignatureIssueCodeEnum.MISSING_CORPORATE_MOBILE, message: 'Celular corporativo vazio no AD.' }),
  },
  {
    key: 'ramal',
    label: 'Ramal',
    group: 'AD',
    description: 'Só o número do ramal',
    read: (c) => c.extension.trim(),
    missing: () => ({ code: SignatureIssueCodeEnum.MISSING_EXTENSION, message: 'Ramal vazio no AD.' }),
  },
  {
    key: 'telefone_0800',
    label: '0800 (Telephone number)',
    group: 'AD',
    description: 'Só sai se for um 0800 válido',
    read: (c) => format0800(c.phone0800) ?? '',
    missing: (c) =>
      c.phone0800.trim()
        ? { code: SignatureIssueCodeEnum.INVALID_PHONE_0800, message: `Telephone number do AD não é um 0800: "${c.phone0800}".` }
        : { code: SignatureIssueCodeEnum.MISSING_PHONE_0800, message: 'Telephone number (0800) vazio no AD.' },
  },
  {
    key: 'celular_informado',
    label: 'Celular informado pela pessoa',
    group: 'SISTEMA',
    description: 'Digitado pela própria pessoa, formatado',
    read: (c) => (c.informedMobile ? TextHelper.formatPhone(c.informedMobile) : ''),
    missing: () => ({ code: SignatureIssueCodeEnum.MISSING_INFORMED_MOBILE, message: 'Aguardando a pessoa informar o celular.' }),
  },
  {
    key: 'frase',
    label: 'Frase (tela Frases)',
    group: 'SISTEMA',
    description: 'Perfil de frase › frase do time › frase padrão',
    read: (_c, context) => context.phrase,
  },
];

const BY_KEY = new Map(FIELDS.map((f) => [f.key, f]));

/**
 * Variáveis dos modelos antigos sem campo de mesmo nome: o valor quando nenhuma regra decide.
 * Nome de campo = vem daquele campo; null = vazio.
 */
const LEGACY_DEFAULTS: Record<string, string | null> = { setor: 'time', contato: null, contato_celular: null, contato_ramal: null };

const PLACEHOLDER = /\{\{\s*([#^/]?)\s*(\w+)\s*\}\}/g;

/** Campos que uma regra pode pôr numa variável do modelo, e o valor de cada um para uma pessoa. */
export class SignatureFieldsHelper {
  static list(): SignatureField[] {
    return FIELDS.map(({ key, label, group, description }) => ({ key, label, group, description }));
  }

  static isField(key: string): boolean {
    return BY_KEY.has(key);
  }

  /** Valor de cada campo para a pessoa, já formatado. */
  static values(collaborator: Collaborator, context: FieldContext): Record<string, string> {
    return Object.fromEntries(FIELDS.map((f) => [f.key, (f.read(collaborator, context) ?? '').trim()]));
  }

  /** Valor de uma variável que nenhuma regra decidiu: campo de mesmo nome, padrão antigo ou vazio. */
  static defaultValue(key: string, fieldValues: Record<string, string>): string {
    if (BY_KEY.has(key)) return fieldValues[key] ?? '';
    const legacy = LEGACY_DEFAULTS[key];
    return legacy ? (fieldValues[legacy] ?? '') : '';
  }

  /** "Cargo", "Time" ou "Vazio": o que a variável mostra quando nenhuma regra decide. */
  static defaultLabel(key: string): string {
    const field = BY_KEY.get(key) ?? BY_KEY.get(LEGACY_DEFAULTS[key] ?? '');
    return field?.label ?? 'Vazio';
  }

  /** Pendência de um campo escolhido por regra e vazio na pessoa; null se não é pendência. */
  static missingIssue(key: string, collaborator: Collaborator, fieldValues: Record<string, string>) {
    const field = BY_KEY.get(key);
    if (!field?.missing || fieldValues[key]) return null;
    return field.missing(collaborator);
  }

  /** Campos citados num texto fixo ("Ramal {{ramal}}" → ["ramal"]). */
  static fieldsIn(text: string): string[] {
    return [...new Set([...text.matchAll(PLACEHOLDER)].map((m) => m[2]))];
  }

  /**
   * Texto fixo de uma regra, com os campos citados trocados pelo valor.
   * Se algum campo citado estiver vazio, a variável fica vazia (evita "Ramal " sem número).
   */
  static renderText(text: string, fieldValues: Record<string, string>): string {
    const fields = SignatureFieldsHelper.fieldsIn(text);
    if (fields.some((key) => !fieldValues[key])) return '';
    return text.replace(PLACEHOLDER, (_m, _kind: string, key: string) => fieldValues[key] ?? '').trim();
  }

  /** Problemas num texto fixo: só {{campo}} conhecido, sem blocos. */
  static validateText(text: string): string[] {
    const problems: string[] = [];
    for (const [, kind, key] of text.matchAll(PLACEHOLDER)) {
      if (kind) problems.push(`Blocos ({{${kind}${key}}}) não valem no texto; use só {{campo}}.`);
      else if (!BY_KEY.has(key)) problems.push(`Campo desconhecido no texto: {{${key}}}.`);
    }
    return [...new Set(problems)];
  }
}
