import { z } from 'zod'
import type { SignatureRule, SignatureRuleInput } from '../../types/api'

const VALUELESS = ['IS_EMPTY', 'IS_NOT_EMPTY']

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
      phone0800Mode: z.enum(['', 'DIRECTORY', 'FIXED']),
      phone0800: z.string().max(20, 'Até 20 caracteres.'),
      templateId: z.string(),
      contact: z.enum([
        '',
        'NONE',
        'CORPORATE_MOBILE',
        'INFORMED_MOBILE',
        'EXTENSION',
      ]),
      sectorLabel: z.enum(['', 'AREA', 'TEAM']),
      phraseMode: z.enum(['', 'TEAM', 'FIXED', 'NONE']),
      phraseText: z.string().max(140, 'Até 140 caracteres.'),
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
    const o = form.outputs
    if (
      ![
        o.phone0800Mode,
        o.contact,
        o.sectorLabel,
        o.phraseMode,
        o.templateId,
      ].some(Boolean)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['outputs'],
        message: 'A regra precisa definir pelo menos uma parte da assinatura.',
      })
    }
    if (o.phone0800Mode === 'FIXED' && !o.phone0800.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['outputs', 'phone0800'],
        message: 'Informe o 0800.',
      })
    }
    if (o.phraseMode === 'FIXED' && !o.phraseText.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['outputs', 'phraseText'],
        message: 'Escreva a frase.',
      })
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
    outputs: {
      phone0800Mode: '',
      phone0800: '',
      templateId: '',
      contact: '',
      sectorLabel: '',
      phraseMode: '',
      phraseText: '',
    },
  }
}

export function ruleToForm(rule: SignatureRule): RuleFormValues {
  const o = rule.outputs
  return {
    name: rule.name,
    description: rule.description ?? '',
    priority: rule.priority,
    active: rule.active,
    conditions: rule.conditions.map((c) => ({ ...c, values: [...c.values] })),
    outputs: {
      phone0800Mode: o.phone0800Mode ?? (o.phone0800 ? 'FIXED' : ''),
      phone0800: o.phone0800 ?? '',
      templateId: o.templateId ?? '',
      contact: o.contact ?? '',
      sectorLabel: o.sectorLabel ?? '',
      phraseMode: o.phraseMode ?? '',
      phraseText: o.phraseText ?? '',
    },
  }
}

/** '' na tela = "esta regra não mexe nessa parte" = null na API. */
export function formToInput(form: RuleFormValues): SignatureRuleInput {
  const o = form.outputs
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
      phone0800Mode: o.phone0800Mode || null,
      phone0800:
        o.phone0800Mode === 'FIXED' ? o.phone0800.trim() || null : null,
      templateId: o.templateId || null,
      contact: o.contact || null,
      sectorLabel: o.sectorLabel || null,
      phraseMode: o.phraseMode || null,
      phraseText: o.phraseMode === 'FIXED' ? o.phraseText.trim() || null : null,
    },
  }
}
