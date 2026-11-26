import { useTemplateVariables } from '../../hooks/useTemplateVariables'
import type { DecisionSlot, SignatureEvaluation } from '../../types/api'
import {
  choiceLabel,
  PHRASE_ORIGIN_LABELS,
  slotLabel,
} from '../../utils/labels'

/** "Perfil: Diretoria técnica", "Frase do time (Dp · Administrativo)", "Frase padrão"… */
function phraseOriginText(origin: SignatureEvaluation['phraseOrigin']): string {
  if (origin.kind === 'PROFILE') return `Perfil: ${origin.label}`
  if (origin.kind === 'TEAM')
    return `${PHRASE_ORIGIN_LABELS.TEAM} (${origin.label})`
  return PHRASE_ORIGIN_LABELS[origin.kind]
}

/**
 * "Por que saiu assim": o modelo e cada variável que ele usa — o valor final, de onde veio e a regra que decidiu.
 * `variables`: as variáveis do modelo da pessoa, na ordem em que aparecem.
 */
export function DecisionList({
  evaluation,
  templateName,
  variables,
}: {
  evaluation: SignatureEvaluation
  templateName: string
  variables: string[]
}) {
  const { decisions, content } = evaluation
  const info = useTemplateVariables()
  const defaults = new Map(
    (info.data?.variables ?? []).map((v) => [v.key, v.defaultLabel])
  )

  const rows: Array<{
    slot: DecisionSlot
    value: string
    detail: string
    rule: string | null
    priority: number | null
  }> = [
    {
      slot: 'template',
      value: templateName,
      detail: decisions.template ? '' : 'modelo padrão',
      rule: decisions.template?.ruleName ?? null,
      priority: decisions.template?.priority ?? null,
    },
    ...variables.map((key) => {
      const decision = decisions.variables[key]
      const usesPhrase = decision
        ? decision.value.source === 'FIELD' && decision.value.field === 'frase'
        : key === 'frase'
      const source = decision
        ? choiceLabel(decision.value, info.fieldLabels)
        : `padrão: ${defaults.get(key) ?? 'Vazio'}`
      return {
        slot: `var:${key}` as DecisionSlot,
        value: content.values[key] || '—',
        detail: usesPhrase
          ? `${source} · ${phraseOriginText(evaluation.phraseOrigin)}`
          : source,
        rule: decision?.ruleName ?? null,
        priority: decision?.priority ?? null,
      }
    }),
  ]

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-surface-container-low text-left text-[10.5px] uppercase tracking-wide text-on-surface-variant">
          <th className="px-2.5 py-1.5 font-semibold">Parte</th>
          <th className="px-2.5 py-1.5 font-semibold">Ficou</th>
          <th className="px-2.5 py-1.5 font-semibold">Decidido por</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-outline-variant">
        {rows.map((row) => (
          <tr key={row.slot} className="align-top">
            <td className="px-2.5 py-2 font-mono text-[12.5px] text-on-surface-variant">
              {slotLabel(row.slot)}
            </td>
            <td className="px-2.5 py-2">
              <div className="font-medium">{row.value}</div>
              {row.detail && (
                <div className="text-xs text-on-surface-variant">
                  {row.detail}
                </div>
              )}
            </td>
            <td className="px-2.5 py-2">
              {row.rule ? (
                <span>
                  {row.rule}{' '}
                  <span className="text-xs tabular-nums text-on-surface-variant">
                    · p{row.priority}
                  </span>
                </span>
              ) : (
                <span className="text-on-surface-variant">nenhuma regra</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
