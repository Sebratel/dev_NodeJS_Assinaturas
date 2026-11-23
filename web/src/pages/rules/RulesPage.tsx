import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AppPageHeader } from '../../components/layout/AppPageHeader'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ErrorState, LoadingState } from '../../components/ui/States'
import { Switch } from '../../components/ui/Switch'
import { derivedQueryRoots, queryKeys } from '../../services/query-keys'
import { reportService } from '../../services/report.service'
import { signatureRuleService } from '../../services/signature-rule.service'
import { signatureTemplateService } from '../../services/signature-template.service'
import type { Level, SignatureRule } from '../../types/api'
import { formatNumber } from '../../utils/format'
import {
  emptyRuleForm,
  formToInput,
  ruleToForm,
  type RuleFormValues,
} from './rule-form'
import { describeCondition, describeOutputs } from './rule-summary'
import { RuleEditor } from './RuleEditor'

/** Estado de navegação vindo da Cobertura: "criar regra para este grupo". */
export interface RuleDraftState {
  draftFor?: { area: string; team: string; level: Level }
}

type EditorState = {
  rule: SignatureRule | null
  initial?: RuleFormValues
} | null

export function RulesPage() {
  const queryClient = useQueryClient()
  const location = useLocation()
  const navigate = useNavigate()
  const rules = useQuery({
    queryKey: queryKeys.rules,
    queryFn: signatureRuleService.list,
  })
  const coverage = useQuery({
    queryKey: queryKeys.coverage,
    queryFn: reportService.coverage,
  })
  const templates = useQuery({
    queryKey: queryKeys.templates,
    queryFn: signatureTemplateService.list,
  })
  // Vindo da Cobertura com "criar regra para este grupo": o editor já abre preenchido.
  const [editor, setEditor] = useState<EditorState>(() => {
    const draftFor = (location.state as RuleDraftState | null)?.draftFor
    if (!draftFor) return null
    const initial = emptyRuleForm(20)
    initial.name = `${draftFor.team || draftFor.area}`
    initial.conditions = [
      { field: 'team', operator: 'IN', values: [draftFor.team] },
      { field: 'level', operator: 'IN', values: [draftFor.level] },
    ]
    return { rule: null, initial }
  })

  // Limpa o pedido do histórico, para o editor não reabrir ao voltar/recarregar.
  useEffect(() => {
    if (location.state)
      navigate(location.pathname, { replace: true, state: null })
  }, [location.state, location.pathname, navigate])

  const toggle = useMutation({
    mutationFn: (rule: SignatureRule) =>
      signatureRuleService.update(rule.id, {
        ...formToInput(ruleToForm(rule)),
        active: !rule.active,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rules })
      derivedQueryRoots.forEach((queryKey) =>
        queryClient.invalidateQueries({ queryKey })
      )
    },
  })

  const statsById = new Map((coverage.data?.rules ?? []).map((r) => [r.id, r]))
  const templateNames = new Map(
    (templates.data ?? []).map((t) => [t.id, t.name])
  )

  return (
    <div className="grid gap-4">
      <AppPageHeader
        description={
          <>
            Todas as regras que valem para a pessoa se somam. Em cada parte da
            assinatura, vence a de{' '}
            <strong className="text-on-surface">prioridade maior</strong>.
          </>
        }
        actions={
          <Button
            variant="primary"
            icon={<Plus className="size-4" />}
            onClick={() => setEditor({ rule: null })}
          >
            Nova regra
          </Button>
        }
      />

      {rules.isLoading && <LoadingState />}
      {rules.isError && (
        <ErrorState error={rules.error} onRetry={() => rules.refetch()} />
      )}

      {rules.data && (
        <div className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="bg-surface-container-low text-left text-[10.5px] uppercase tracking-wide text-on-surface-variant">
                  <th className="w-14 px-3 py-2 font-semibold">Prior.</th>
                  <th className="px-3 py-2 font-semibold">Regra</th>
                  <th className="px-3 py-2 font-semibold">Quando</th>
                  <th className="px-3 py-2 font-semibold">Define</th>
                  <th
                    className="px-3 py-2 text-right font-semibold"
                    title="Pessoas em que a regra vale · pessoas em que ela decide alguma parte"
                  >
                    Vale · decide
                  </th>
                  <th className="w-14 px-3 py-2 font-semibold">Ativa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {rules.data.map((rule) => {
                  const stats = statsById.get(rule.id)
                  return (
                    <tr
                      key={rule.id}
                      className="cursor-pointer align-top hover:bg-surface-container-low"
                      onClick={() => setEditor({ rule })}
                    >
                      <td className="px-3 py-2">
                        <Badge tone="brand" className="tabular-nums">
                          {rule.priority}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <div
                          className={
                            rule.active
                              ? 'font-medium'
                              : 'font-medium text-on-surface-variant line-through'
                          }
                        >
                          {rule.name}
                        </div>
                        {rule.description && (
                          <div className="max-w-72 text-xs text-on-surface-variant">
                            {rule.description}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {rule.conditions.length === 0 ? (
                          <span className="text-on-surface-variant">Todos</span>
                        ) : (
                          rule.conditions.map((c, i) => (
                            <div key={i}>
                              {i > 0 && (
                                <span className="text-on-surface-variant">
                                  e{' '}
                                </span>
                              )}
                              {describeCondition(c)}
                            </div>
                          ))
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex max-w-80 flex-wrap gap-1">
                          {describeOutputs(rule.outputs, templateNames).map(
                            (part) => (
                              <Badge key={part}>{part}</Badge>
                            )
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {stats ? (
                          <>
                            {formatNumber(stats.matched)} ·{' '}
                            <span
                              className={
                                stats.matched > 0 && stats.wins === 0
                                  ? 'text-amber-700 dark:text-amber-300'
                                  : ''
                              }
                            >
                              {formatNumber(stats.wins)}
                            </span>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td
                        className="px-3 py-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Switch
                          checked={rule.active}
                          onChange={() => toggle.mutate(rule)}
                          label={
                            rule.active ? 'Desativar regra' : 'Ativar regra'
                          }
                          disabled={toggle.isPending}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editor && (
        <RuleEditor
          key={editor.rule?.id ?? 'new'}
          rule={editor.rule}
          initial={editor.initial}
          onClose={() => setEditor(null)}
        />
      )}
    </div>
  )
}
