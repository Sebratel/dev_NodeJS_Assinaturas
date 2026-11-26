import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { SignatureCanvas } from '../../components/signature/SignatureCanvas'
import { Badge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'
import type { RuleSimulation, SignatureStatus } from '../../types/api'
import { cn } from '../../utils/cn'
import type { RuleSimulationState } from './useRuleSimulation'
import { formatNumber } from '../../utils/format'
import {
  LEVEL_LABELS,
  slotLabel,
  STATUS_LABELS,
  STATUS_TONES,
} from '../../utils/labels'

type Simulation = RuleSimulationState

/**
 * A assinatura com a regra do rascunho, com cada variável marcada no lugar onde fica.
 * Prévia = assinatura de uma pessoa; Mapa = o modelo com o nome de cada variável no lugar.
 */
export function RuleSignaturePanel({
  sim,
  activeVar,
  numbers,
  onHoverVar,
  onSelectVar,
}: {
  sim: Simulation
  activeVar: string | null
  numbers: Record<string, number>
  onHoverVar: (key: string | null) => void
  onSelectVar: (key: string) => void
}) {
  const [view, setView] = useState<'preview' | 'map'>('preview')
  const data = sim.simulation.data
  const preview = data?.preview ?? null

  return (
    <section className="grid gap-2 rounded-2xl border border-outline-variant bg-surface-container-lowest p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Assinatura</h3>
        <div
          role="tablist"
          aria-label="Ver a assinatura"
          className="flex rounded-lg bg-surface-container-low p-0.5 text-xs font-medium"
        >
          {(
            [
              ['preview', 'Prévia'],
              ['map', 'Mapa do modelo'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={view === value}
              onClick={() => setView(value)}
              className={cn(
                'rounded-md px-2.5 py-1 transition',
                view === value
                  ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {!sim.ready && (
        <p className="text-xs text-on-surface-variant">
          Complete as condições e o que a regra define para ver a assinatura.
        </p>
      )}
      {sim.ready && sim.simulation.isError && (
        <p className="text-xs text-rose-700 dark:text-rose-300">
          {sim.simulation.error instanceof Error
            ? sim.simulation.error.message
            : 'Não deu para simular.'}
        </p>
      )}
      {sim.ready && !data && !sim.simulation.isError && (
        <p className="flex items-center gap-2 text-xs text-on-surface-variant">
          <Spinner className="size-3.5" /> Montando a assinatura…
        </p>
      )}
      {data && !preview && (
        <p className="text-xs text-on-surface-variant">
          A regra não pega ninguém: sem assinatura para mostrar.
        </p>
      )}

      {preview && (
        <div
          className={cn(
            'grid gap-2 transition-opacity',
            sim.simulation.isPlaceholderData && 'opacity-60'
          )}
        >
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-on-surface-variant">
            {view === 'preview' ? (
              <>
                <span className="font-semibold text-on-surface">
                  {preview.name}
                </span>
                <Badge tone={STATUS_TONES[preview.status]}>
                  {STATUS_LABELS[preview.status]}
                </Badge>
                <span>
                  {preview.changed ? 'muda com esta regra' : 'igual à de hoje'}
                </span>
              </>
            ) : (
              <span>
                Onde cada variável fica no modelo, numeradas como na lista.
              </span>
            )}
            <span aria-hidden>·</span>
            <span>modelo {preview.templateName}</span>
          </div>
          {view === 'preview' && !preview.matched && (
            <p className="text-xs text-amber-800 dark:text-amber-200">
              A regra não pega esta pessoa: é a assinatura de hoje.
            </p>
          )}
          <SignatureCanvas
            html={view === 'preview' ? preview.annotatedHtml : preview.mapHtml}
            title={
              view === 'preview'
                ? `Prévia da assinatura de ${preview.name}`
                : `Mapa do modelo ${preview.templateName}`
            }
            activeVar={activeVar}
            numbers={numbers}
            showNumbers={view === 'map'}
            onHover={onHoverVar}
            onSelect={onSelectVar}
          />
          <div className="flex flex-wrap items-start justify-between gap-2 text-[11px] text-on-surface-variant">
            <span>
              Passe o mouse numa variável para achá-la na lista; clique para
              editar.
            </span>
            <span className="tabular-nums">
              {formatNumber(preview.htmlLength)} de{' '}
              {formatNumber(preview.gmailLimit)} caracteres do Gmail
            </span>
          </div>
          {preview.decidedHere.length > 0 && (
            <p className="text-xs text-on-surface-variant">
              Esta regra decide para {preview.name.split(' ')[0]}:{' '}
              {preview.decidedHere.map(slotLabel).join(', ')}.
            </p>
          )}
        </div>
      )}
    </section>
  )
}

/** Quem a regra pega, como mudam os status e as pessoas (clique troca a pessoa da prévia). */
export function RuleImpact({ sim }: { sim: Simulation }) {
  const data: RuleSimulation | undefined = sim.simulation.data
  if (!sim.ready || !data) return null

  const changed = (Object.keys(data.before) as SignatureStatus[]).filter(
    (s) => data.before[s] !== data.after[s]
  )
  const selected = data.preview?.collaboratorId
  return (
    <section
      className={cn(
        'grid gap-2.5 rounded-2xl border border-primary/25 bg-primary/10 p-3 transition-opacity',
        sim.simulation.isPlaceholderData && 'opacity-60'
      )}
      aria-busy={sim.simulation.isFetching}
    >
      <h3 className="text-sm font-semibold">Efeito</h3>
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
                  onClick={() => sim.setPreviewId(p.id)}
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
    </section>
  )
}
