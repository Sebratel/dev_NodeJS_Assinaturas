import { z } from 'zod'
import type {
  RuleVariable,
  SignatureRule,
  SignatureRuleInput,
} from '../../types/api'

const VALUELESS = ['IS_EMPTY', 'IS_NOT_EMPTY']

/**
 * Escolha de uma variável na tela: '' = a regra não mexe; 'EMPTY' = vazio;
 * 'TEXT' = texto fixo; 'FIELD:cargo' = campo.
 */
export type VariableChoiceValue = '' | 'EMPTY' | 'TEXT' | `FIELD:${string}`

export interface VariableFormValue {
  choice: VariableChoiceValue
  text: string
  /** Com campo ou texto: antes e depois do valor ("Time:"). Vazio = só o valor. */
  prefix: string
  suffix: string
}

export const ruleFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Dê um nome à regra.')
      .max(80, 'Até 80 caracteres.'),
    description: z.string().max(300, 'Até 300 caracteres.'),
    priority: z
      .number({ error: 'Informe um número.' })
      .int('Número inteiro.')
      .min(0, 'Mínimo 0.')
      .max(1000, 'Máximo 1000.'),
    active: z.boolean(),
    conditions: z.array(
      z.object({
        field: z.enum([
          'area',
          'team',
          'level',
          'title',
          'company',
          'segment',
          'state',
          'office',
        ]),
        operator: z.enum([
          'IN',
          'NOT_IN',
          'CONTAINS',
          'IS_EMPTY',
          'IS_NOT_EMPTY',
        ]),
        values: z.array(z.string()),
      })
    ),
    outputs: z.object({
      templateId: z.string(),
      /** Variável do modelo → escolha. */
      variables: z.record(
        z.string(),
        z.object({
          choice: z.custom<VariableChoiceValue>((v) => typeof v === 'string'),
          text: z.string().max(200, 'Até 200 caracteres.'),
          prefix: z.string().max(40, 'Até 40 caracteres.'),
          suffix: z.string().max(40, 'Até 40 caracteres.'),
        })
      ),
    }),
  })
  .superRefine((form, ctx) => {
    form.conditions.forEach((condition, i) => {
      if (
        !VALUELESS.includes(condition.operator) &&
        !condition.values.some((v) => v.trim())
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['conditions', i, 'values'],
          message: 'Escolha pelo menos um valor.',
        })
      }
    })
    const { templateId, variables } = form.outputs
    if (!templateId && !Object.values(variables).some((v) => v.choice)) {
      ctx.addIssue({
        code: 'custom',
        path: ['outputs'],
        message: 'A regra precisa definir o modelo ou pelo menos uma variável.',
      })
    }
    for (const [key, v] of Object.entries(variables)) {
      if (v.choice === 'TEXT' && !v.text.trim()) {
        ctx.addIssue({
          code: 'custom',
          path: ['outputs', 'variables', key, 'text'],
          message: 'Escreva o texto ou escolha Vazio.',
        })
      }
    }
  })

export type RuleFormValues = z.infer<typeof ruleFormSchema>

export function emptyRuleForm(priority = 20): RuleFormValues {
  return {
    name: '',
    description: '',
    priority,
    active: true,
    conditions: [{ field: 'team', operator: 'IN', values: [] }],
    outputs: { templateId: '', variables: {} },
  }
}

export function variableToForm(v: RuleVariable): VariableFormValue {
  const affix = { prefix: v.prefix ?? '', suffix: v.suffix ?? '' }
  if (v.source === 'FIELD')
    return { choice: `FIELD:${v.field ?? ''}`, text: '', ...affix }
  if (v.source === 'TEXT')
    return { choice: 'TEXT', text: v.text ?? '', ...affix }
  return { choice: v.source, text: '', prefix: '', suffix: '' }
}

export function ruleToForm(rule: SignatureRule): RuleFormValues {
  return {
    name: rule.name,
    description: rule.description ?? '',
    priority: rule.priority,
    active: rule.active,
    conditions: rule.conditions.map((c) => ({ ...c, values: [...c.values] })),
    outputs: {
      templateId: rule.outputs.templateId ?? '',
      variables: Object.fromEntries(
        (rule.outputs.variables ?? []).map((v) => [v.key, variableToForm(v)])
      ),
    },
  }
}

function formToVariable(
  key: string,
  v: VariableFormValue
): RuleVariable | null {
  if (!v.choice) return null
  if (v.choice === 'EMPTY') return { key, source: 'EMPTY' }
  // Prefixo e sufixo só valem com valor (campo ou texto) e só vão se preenchidos.
  const affix: Pick<RuleVariable, 'prefix' | 'suffix'> = {}
  if (v.prefix?.trim()) affix.prefix = v.prefix.trim()
  if (v.suffix?.trim()) affix.suffix = v.suffix.trim()
  if (v.choice === 'TEXT')
    return { key, source: 'TEXT', text: v.text.trim(), ...affix }
  return {
    key,
    source: 'FIELD',
    field: v.choice.slice('FIELD:'.length),
    ...affix,
  }
}

/** '' na tela = "esta regra não mexe nisso" = fora da lista na API. */
export function formToInput(form: RuleFormValues): SignatureRuleInput {
  const variables = Object.entries(form.outputs?.variables ?? {})
    .map(([key, v]) => formToVariable(key, v))
    .filter((v): v is RuleVariable => v !== null)
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    priority: form.priority,
    active: form.active,
    conditions: form.conditions.map((c) => ({
      ...c,
      values: VALUELESS.includes(c.operator) ? [] : c.values,
    })),
    outputs: {
      templateId: form.outputs?.templateId || null,
      variables: variables.length ? variables : null,
    },
  }
}
