import { describe, expect, it } from 'vitest'
import { emptyRuleForm, formToInput, ruleFormSchema } from './rule-form'
import { describeOutputs } from './rule-summary'

const withVariables = (
  variables: ReturnType<typeof emptyRuleForm>['outputs']['variables']
) => {
  const form = emptyRuleForm()
  form.name = 'B2B'
  form.conditions = []
  form.outputs.variables = variables
  return form
}

describe('rule-form: variáveis do modelo', () => {
  it('regra que só esconde uma variável é válida; texto só vai em TEXT', () => {
    const form = withVariables([
      { key: 'cargo', mode: 'HIDE', text: 'sobra' },
      { key: 'setor', mode: 'TEXT', text: ' {{empresa}} ' },
    ])
    expect(ruleFormSchema.safeParse(form).success).toBe(true)
    expect(formToInput(form).outputs.variables).toEqual([
      { key: 'cargo', mode: 'HIDE', text: null },
      { key: 'setor', mode: 'TEXT', text: '{{empresa}}' },
    ])
    expect(formToInput(withVariables([])).outputs.variables).toBeNull()
  })

  it('recusa variável repetida e texto vazio', () => {
    const result = ruleFormSchema.safeParse(
      withVariables([
        { key: 'cargo', mode: 'HIDE', text: '' },
        { key: 'cargo', mode: 'TEXT', text: ' ' },
      ])
    )
    const messages = result.error?.issues.map((i) => i.message) ?? []
    expect(messages).toContain('Essa variável já está na lista.')
    expect(messages).toContain('Escreva o texto ou escolha Ocultar.')
  })

  it('resumo da regra mostra o que ela faz com cada variável', () => {
    expect(
      describeOutputs({
        variables: [
          { key: 'cargo', mode: 'HIDE' },
          { key: 'setor', mode: 'TEXT', text: '{{empresa}}' },
        ],
      })
    ).toEqual(['Oculta {{cargo}}', '{{setor}}: "{{empresa}}"'])
  })
})
