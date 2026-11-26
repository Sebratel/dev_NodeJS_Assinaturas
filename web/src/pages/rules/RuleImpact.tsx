import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { SignaturePreview } from '../../components/signature/SignaturePreview'
import { Badge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { signatureRuleService } from '../../services/signature-rule.service'
import type {
  RulePreview,
  SignatureRuleInput,
  SignatureStatus,
} from '../../types/api'
import { cn } from '../../utils/cn'
import { formatNumber } from '../../utils/format'
import {
  LEVEL_LABELS,
  SLOT_LABELS,
  STATUS_LABELS,
  STATUS_TONES,
} from '../../utils/labels'

/** Como a assinatura de uma pessoa fica com a regra do rascunho. */
function PreviewBlock({ preview }: { preview: RulePreview }) {
  return (
    <div className="grid gap-1.5 border-t border-primary/20 pt-2.5">
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-on-surface-variant">
        <span className="font-semibold text-on-surface">
          Prévia · {preview.name}
        </span>
        <Badge tone={STATUS_TONES[preview.status]}>
          {STATUS_LABELS[preview.status]}
        </Badge>
        <span>modelo {preview.templateName}</span>
        <span aria-hidden>·</span>
        <span>
          {preview.changed ? 'muda com esta regra' : 'igual à de hoje'}
        </span>
      </div>
      {!preview.matched && (
        <p className="text-xs text-amber-800 dark:text-amber-200">
          A regra não pega esta pessoa: a prévia mostra a assinatura de hoje.
        </p>
      )}
      {preview.decidedHere.length > 0 && (
        <p className="text-xs text-on-surface-variant">
          Esta regra decide:{' '}
          {preview.decidedHere.map((slot) => SLOT_LABELS[slot]).join(', ')}.
        </p>
      )}
      <SignaturePreview
        html={preview.html}
        title={`Prévia da assinatura de ${preview.name}`}
      />
      <p className="text-right text-[11px] text-on-surface-variant tabular-nums">
        {formatNumber(preview.htmlLength)} de {formatNumber(preview.gmailLimit)}{' '}
        caracteres do Gmail
      </p>
    </div>
  )
}

/**
 * Efeito da regra que está sendo editada, recalculado enquanto se digita (nada é gravado): quem ela pega, como
 * mudam os status e a assinatura de uma das pessoas, já com a regra do rascunho.
 */
export function RuleImpact({
  input,
  ruleId,
  ready,
}: {
  input: SignatureRuleInput
  ruleId?: string
  ready: boolean
}) {
  // Pessoa da prévia. Sem escolha, a API mostra a primeira que a regra pega.
  const [previewId, setPreviewId] = useState<string | null>(null)
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
    queryKey: ['simulation', debounced, previewId],
    queryFn: () =>
      signatureRuleService.simulate({
        ...payload,
        previewCollaboratorId: previewId ?? undefined,
      }),
    enabled: ready && debouncedReady,
    staleTime: 10_000,
    // Mantém o resultado anterior enquanto recalcula: a prévia não pisca a cada tecla.
    placeholderData: (previous) => previous,
  })

  if (!ready) {
    return (
      <p className="text-xs text-on-surface-variant">
        Complete as condições e o que a regra define para ver quem ela pega e a
        prévia da assinatura.
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
  const selected = data.preview?.collaboratorId
  return (
    <div
      className={cn(
        'grid gap-2.5 transition-opacity',
        simulation.isPlaceholderData && 'opacity-60'
      )}
      aria-busy={simulation.isFetching}
    >
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
        <div className="grid gap-1">
          <p className="text-[11px] text-on-surface-variant">
            Clique num nome para ver a assinatura da pessoa.
          </p>
          <ul className="grid gap-0.5 text-xs text-on-surface-variant">
            {data.sample.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setPreviewId(p.id)}
                  aria-pressed={p.id === selected}
                  className={cn(
                    'w-full truncate rounded-md px-1.5 py-0.5 text-left transition hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                    p.id === selected && 'bg-primary/20'
                  )}
                >
                  <span className="text-on-surface">{p.name}</span> ·{' '}
                  {p.team || 'sem time'} · {LEVEL_LABELS[p.level]}
                </button>
              </li>
            ))}
            {data.matched > data.sample.length && (
              <li className="px-1.5">
                e mais {formatNumber(data.matched - data.sample.length)}…
              </li>
            )}
          </ul>
        </div>
      )}
      {data.preview && <PreviewBlock preview={data.preview} />}
    </div>
  )
}
