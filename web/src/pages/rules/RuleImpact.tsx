import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { signatureRuleService } from '../../services/signature-rule.service'
import type { SignatureRuleInput, SignatureStatus } from '../../types/api'
import { formatNumber } from '../../utils/format'
import { LEVEL_LABELS, STATUS_LABELS, STATUS_TONES } from '../../utils/labels'

/** Efeito da regra que está sendo editada, recalculado enquanto se digita (nada é gravado). */
export function RuleImpact({
  input,
  ruleId,
  ready,
}: {
  input: SignatureRuleInput
  ruleId?: string
  ready: boolean
}) {
  // "Pronto" e o rascunho atrasam juntos: senão a simulação sai com um rascunho velho e a API recusa.
  const debounced = useDebouncedValue(
    JSON.stringify({
      ready,
      input: { ...input, name: input.name || 'Rascunho', id: ruleId },
    }),
    400
  )
  const { ready: debouncedReady, input: payload } = JSON.parse(debounced) as {
    ready: boolean
    input: SignatureRuleInput & { id?: string }
  }
  const simulation = useQuery({
    queryKey: ['simulation', debounced],
    queryFn: () => signatureRuleService.simulate(payload),
    enabled: ready && debouncedReady,
    staleTime: 10_000,
  })

  if (!ready) {
    return (
      <p className="text-xs text-on-surface-variant">
        Complete as condições e o que a regra define para ver quem ela pega.
      </p>
    )
  }
  if (simulation.isError) {
    return (
      <p className="text-xs text-rose-700 dark:text-rose-300">
        {simulation.error instanceof Error
          ? simulation.error.message
          : 'Não deu para simular.'}
      </p>
    )
  }
  const data = simulation.data
  if (!data) {
    return (
      <p className="flex items-center gap-2 text-xs text-on-surface-variant">
        <Spinner className="size-3.5" /> Simulando…
      </p>
    )
  }

  const changed = (Object.keys(data.before) as SignatureStatus[]).filter(
    (s) => data.before[s] !== data.after[s]
  )
  return (
    <div className="grid gap-2.5">
      <p className="text-sm">
        Pega{' '}
        <strong className="tabular-nums">{formatNumber(data.matched)}</strong>{' '}
        pessoas e decide alguma parte da assinatura de{' '}
        <strong className="tabular-nums">{formatNumber(data.wins)}</strong>.
        {data.matched > 0 && data.wins === 0 && (
          <span className="block text-xs text-amber-800 dark:text-amber-200">
            Outras regras de prioridade maior decidem tudo por ela: suba a
            prioridade.
          </span>
        )}
      </p>
      {changed.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {changed.map((status) => (
            <Badge key={status} tone={STATUS_TONES[status]}>
              {STATUS_LABELS[status]} {formatNumber(data.before[status])}{' '}
              <ArrowRight className="size-3" aria-hidden />{' '}
              {formatNumber(data.after[status])}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-xs text-on-surface-variant">
          Não muda nenhum status.
        </p>
      )}
      {data.sample.length > 0 && (
        <ul className="grid gap-0.5 text-xs text-on-surface-variant">
          {data.sample.map((p) => (
            <li key={p.id} className="truncate">
              <span className="text-on-surface">{p.name}</span> ·{' '}
              {p.team || 'sem time'} · {LEVEL_LABELS[p.level]}
            </li>
          ))}
          {data.matched > data.sample.length && (
            <li>e mais {formatNumber(data.matched - data.sample.length)}…</li>
          )}
        </ul>
      )}
    </div>
  )
}
