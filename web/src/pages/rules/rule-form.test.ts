import { describe, expect, it } from 'vitest'
import type { SignatureRule } from '../../types/api'
import {
  emptyRuleForm,
  formToInput,
  ruleFormSchema,
  ruleToForm,
  type RuleFormValues,
} from './rule-form'
import { describeOutputs } from './rule-summary'

const withVariables = (
  variables: RuleFormValues['outputs']['variables'],
  templateId = ''
) => {
  const form = emptyRuleForm()
  form.name = 'B2B'
  form.conditions = []
  form.outputs = { templateId, variables }
  return form
}

describe('rule-form: variáveis do modelo', () => {
  it('campo, texto e vazio viram a lista da API; "não muda" fica de fora', () => {
    const form = withVariables({
      cargo: { choice: 'EMPTY', text: 'sobra' },
      TESTE: { choice: 'FIELD:empresa', text: '' },
      telefone_0800: { choice: 'TEXT', text: ' 0800 365 8000 ' },
      setor: { choice: '', text: '' },
    })
    expect(ruleFormSchema.safeParse(form).success).toBe(true)
    expect(formToInput(form).outputs).toEqual({
      templateId: null,
      variables: [
        { key: 'cargo', source: 'EMPTY' },
        { key: 'TESTE', source: 'FIELD', field: 'empresa' },
        { key: 'telefone_0800', source: 'TEXT', text: '0800 365 8000' },
      ],
    })
    expect(formToInput(withVariables({})).outputs.variables).toBeNull()
  })

  it('ida e volta: a regra gravada abre igual no formulário', () => {
    const rule = {
      id: 'r1',
      name: 'B2B',
      description: '',
      priority: 10,
      active: true,
      conditions: [],
      outputs: {
        templateId: 't1',
        variables: [
          { key: 'contato', source: 'FIELD', field: 'celular_corporativo' },
          { key: 'contato_ramal', source: 'TEXT', text: 'Ramal {{ramal}}' },
        ],
      },
      createdAt: '',
      updatedAt: '',
    } as SignatureRule
    const form = ruleToForm(rule)
    expect(form.outputs.variables.contato.choice).toBe(
      'FIELD:celular_corporativo'
    )
    expect(formToInput(form).outputs).toEqual(rule.outputs)
  })

  it('recusa regra vazia e texto fixo em branco', () => {
    const vazia = ruleFormSchema.safeParse(
      withVariables({ cargo: { choice: '', text: '' } })
    )
    expect(vazia.error?.issues.map((i) => i.message)).toContain(
      'A regra precisa definir o modelo ou pelo menos uma variável.'
    )
    expect(ruleFormSchema.safeParse(withVariables({}, 't1')).success).toBe(true)
    const semTexto = ruleFormSchema.safeParse(
      withVariables({ frase: { choice: 'TEXT', text: ' ' } })
    )
    expect(semTexto.error?.issues.map((i) => i.message)).toContain(
      'Escreva o texto ou escolha Vazio.'
    )
  })

  it('resumo da regra mostra o modelo e cada variável', () => {
    expect(
      describeOutputs(
        {
          templateId: 't1',
          variables: [
            { key: 'cargo', source: 'EMPTY' },
            { key: 'contato', source: 'FIELD', field: 'celular_corporativo' },
            { key: 'telefone_0800', source: 'TEXT', text: '0800 365 8000' },
          ],
        },
        new Map([['t1', 'Sebratel Empresas']]),
        new Map([['celular_corporativo', 'Celular corporativo']])
      )
    ).toEqual([
      'Modelo: Sebratel Empresas',
      '{{cargo}}: Vazio',
      '{{contato}}: Celular corporativo',
      '{{telefone_0800}}: “0800 365 8000”',
    ])
  })
})
