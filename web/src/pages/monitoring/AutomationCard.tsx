import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Play } from 'lucide-react'
import { useState } from 'react'
import { Badge, type BadgeTone } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { ReadOnlyNote } from '../../components/ui/ReadOnlyNote'
import { Switch } from '../../components/ui/Switch'
import { usePermissions } from '../../hooks/usePermissions'
import { ApiError } from '../../services/api-client'
import { automationService } from '../../services/automation.service'
import { derivedQueryRoots } from '../../services/query-keys'
import { settingService } from '../../services/setting.service'
import type {
  AutoApplyRun,
  AutoApplySettings,
  AutomationOverview,
} from '../../types/api'
import { formatNumber, formatRelative } from '../../utils/format'

const OUTCOME_TONE: Record<AutoApplyRun['outcome'], BadgeTone> = {
  OFF: 'neutral',
  GOOGLE_NOT_READY: 'danger',
  NOTHING: 'success',
  STARTED: 'success',
  WAITING_APPROVAL: 'warning',
  ERROR: 'danger',
}
const dateTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : '—'

/** Liga/desliga a gravação automática, mostra a última verificação e o que aguarda aprovação. */
export function AutomationCard({ overview }: { overview: AutomationOverview }) {
  const queryClient = useQueryClient()
  // Automação grava no Gmail: ligar, configurar, verificar agora e aprovar são do Master.
  const { isMaster } = usePermissions()
  const [draft, setDraft] = useState<AutoApplySettings>(overview.settings)
  // Configuração salva mudou: o rascunho recomeça dela (ajuste no render, sem efeito).
  const [draftSource, setDraftSource] = useState(overview.settings)
  if (draftSource !== overview.settings) {
    setDraftSource(overview.settings)
    setDraft(overview.settings)
  }
  const refresh = () =>
    derivedQueryRoots.forEach((queryKey) =>
      queryClient.invalidateQueries({ queryKey })
    )

  const save = useMutation({
    mutationFn: (next: AutoApplySettings) =>
      settingService.update('auto-apply', next),
    onSuccess: refresh,
  })
  const runNow = useMutation({
    mutationFn: automationService.runNow,
    onSuccess: refresh,
  })
  const approve = useMutation({
    mutationFn: automationService.approve,
    onSuccess: refresh,
  })

  const dirty =
    JSON.stringify({ ...draft, enabledAt: null }) !==
    JSON.stringify({ ...overview.settings, enabledAt: null })
  const run = overview.lastRun
  const error = [save.error, runNow.error, approve.error].find(
    (e) => e instanceof ApiError
  ) as ApiError | undefined

  return (
    <Card
      title="Gravação automática"
      subtitle={`Roda depois de cada leitura do AD (a cada ${overview.checkIntervalMinutes} min)`}
      actions={
        isMaster ? (
          <Button
            size="sm"
            icon={<Play className="size-3.5" />}
            loading={runNow.isPending || overview.running}
            onClick={() => runNow.mutate()}
          >
            Verificar agora
          </Button>
        ) : undefined
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <fieldset
          disabled={!isMaster}
          className="m-0 grid min-w-0 content-start gap-2.5 border-0 p-0"
        >
          <label className="flex items-center gap-2.5 text-sm font-medium">
            <Switch
              checked={draft.enabled}
              onChange={(enabled) => setDraft({ ...draft, enabled })}
              label="Automação ligada"
            />
            {draft.enabled ? 'Ligada' : 'Desligada'}
            {overview.settings.enabled && overview.settings.enabledAt && (
              <span className="text-xs font-normal text-on-surface-variant">
                desde {dateTime(overview.settings.enabledAt)}
              </span>
            )}
          </label>
          {[
            [
              'newCollaborators',
              'Colaborador novo no AD (criado depois de ligar) recebe a assinatura',
            ],
            [
              'changes',
              'Quem já recebeu é regravado quando a assinatura gerada muda',
            ],
            [
              'includePending',
              'Gravar também as pendentes (saem sem a parte que falta)',
            ],
          ].map(([key, label]) => (
            <label key={key} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-[var(--color-primary)]"
                checked={
                  draft[
                    key as 'newCollaborators' | 'changes' | 'includePending'
                  ]
                }
                onChange={(e) =>
                  setDraft({ ...draft, [key]: e.target.checked })
                }
              />
              {label}
            </label>
          ))}
          <label className="flex flex-wrap items-center gap-2 text-sm">
            Acima de
            <Input
              type="number"
              min={1}
              max={2000}
              className="w-20"
              value={draft.maxPerRun}
              onChange={(e) =>
                setDraft({ ...draft, maxPerRun: Number(e.target.value) || 1 })
              }
            />
            gravações numa verificação, espera aprovação
          </label>
          {isMaster ? (
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                disabled={!dirty}
                loading={save.isPending}
                onClick={() => save.mutate(draft)}
              >
                Salvar
              </Button>
              {save.isSuccess && !dirty && (
                <span className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300">
                  <Check className="size-3.5" /> Salvo.
                </span>
              )}
            </div>
          ) : (
            <ReadOnlyNote needs="Master" />
          )}
        </fieldset>

        <div className="grid content-start gap-2 text-sm">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <dt className="text-on-surface-variant">Última verificação</dt>
            <dd>
              {overview.lastCheckAt
                ? `${dateTime(overview.lastCheckAt)} (${formatRelative(overview.lastCheckAt)})`
                : '—'}
            </dd>
            <dt className="text-on-surface-variant">Próxima</dt>
            <dd>
              {overview.nextCheckAt ? dateTime(overview.nextCheckAt) : '—'}
            </dd>
          </dl>
          {run && (
            <div className="grid gap-1 rounded-xl border border-outline-variant p-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone={OUTCOME_TONE[run.outcome]}>{run.message}</Badge>
                <span className="text-xs text-on-surface-variant">
                  {formatRelative(run.at)}
                </span>
              </div>
              {run.outcome !== 'OFF' && (
                <p className="text-xs text-on-surface-variant tabular-nums">
                  Novos: {formatNumber(run.newcomers)} · mudanças:{' '}
                  {formatNumber(run.changes)} · aguardando dados:{' '}
                  {formatNumber(run.waitingData)}
                  {run.retryLater > 0 &&
                    ` · tentam de novo em 1 h: ${formatNumber(run.retryLater)}`}
                </p>
              )}
            </div>
          )}
          {overview.pendingApproval && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-950 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200">
              <span className="min-w-0 flex-1">
                Aguardando aprovação:{' '}
                {formatNumber(overview.pendingApproval.newcomers)} novos e{' '}
                {formatNumber(overview.pendingApproval.changes)} mudanças (acima
                do limite).
              </span>
              {isMaster && (
                <Button
                  size="sm"
                  variant="primary"
                  loading={approve.isPending}
                  onClick={() => approve.mutate()}
                >
                  Aprovar e gravar
                </Button>
              )}
            </div>
          )}
          {error && (
            <p className="text-xs text-rose-700 dark:text-rose-300">
              {error.message}
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}
