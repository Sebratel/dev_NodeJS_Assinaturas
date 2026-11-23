import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { Switch } from '../../components/ui/Switch';
import { derivedQueryRoots, queryKeys } from '../../services/query-keys';
import { phraseProfileService } from '../../services/phrase-profile.service';
import { reportService } from '../../services/report.service';
import type { PhraseProfile } from '../../types/api';
import { formatNumber } from '../../utils/format';
import { PHRASE_ORIGIN_LABELS } from '../../utils/labels';
import { describeCondition } from '../rules/rule-summary';
import { PhraseProfileEditor } from './PhraseProfileEditor';

type EditorState = { profile: PhraseProfile | null } | null;

/** Perfis de frase: "quem tem estas características usa esta frase" (nível, área, time, cargo, empresa…). */
export function PhraseProfilesSection() {
  const queryClient = useQueryClient();
  const profiles = useQuery({ queryKey: queryKeys.phraseProfiles, queryFn: phraseProfileService.list });
  const coverage = useQuery({ queryKey: queryKeys.coverage, queryFn: reportService.coverage });
  const [editor, setEditor] = useState<EditorState>(null);

  const toggle = useMutation({
    mutationFn: (p: PhraseProfile) => phraseProfileService.update(p.id, { name: p.name, priority: p.priority, active: !p.active, conditions: p.conditions, phrase: p.phrase }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.phraseProfiles });
      derivedQueryRoots.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
    },
  });

  const stats = new Map((coverage.data?.phraseProfiles ?? []).map((s) => [s.id, s]));
  const origins = coverage.data?.phraseOrigins;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {origins ? (
          <div className="flex flex-wrap gap-1.5 text-xs">
            {(Object.keys(origins) as Array<keyof typeof origins>)
              .filter((k) => origins[k] > 0)
              .map((k) => (
                <Badge key={k} tone={k === 'PROFILE' ? 'brand' : 'neutral'}>
                  {PHRASE_ORIGIN_LABELS[k]}: {formatNumber(origins[k])}
                </Badge>
              ))}
          </div>
        ) : (
          <span />
        )}
        <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEditor({ profile: null })}>
          Novo perfil
        </Button>
      </div>

      {profiles.isLoading && <LoadingState />}
      {profiles.isError && <ErrorState error={profiles.error} onRetry={() => profiles.refetch()} />}
      {profiles.data && profiles.data.length === 0 && (
        <EmptyState title="Nenhum perfil de frase ainda.">Ex.: “Nível é Direção” e “Área é Técnica” → uma frase só para a diretoria técnica.</EmptyState>
      )}
      {profiles.data && profiles.data.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="bg-surface-container-low text-left text-[10.5px] uppercase tracking-wide text-on-surface-variant">
                  <th className="w-14 px-3 py-2 font-semibold">Prior.</th>
                  <th className="px-3 py-2 font-semibold">Perfil</th>
                  <th className="px-3 py-2 font-semibold">Quando</th>
                  <th className="px-3 py-2 font-semibold">Frase</th>
                  <th className="px-3 py-2 text-right font-semibold" title="Pessoas que casam · pessoas cuja frase sai deste perfil">
                    Casa · decide
                  </th>
                  <th className="w-14 px-3 py-2 font-semibold">Ativo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {profiles.data.map((p) => {
                  const s = stats.get(p.id);
                  return (
                    <tr key={p.id} className="cursor-pointer align-top hover:bg-surface-container-low" onClick={() => setEditor({ profile: p })}>
                      <td className="px-3 py-2">
                        <Badge tone="brand" className="tabular-nums">
                          {p.priority}
                        </Badge>
                      </td>
                      <td className={p.active ? 'px-3 py-2 font-medium' : 'px-3 py-2 font-medium text-on-surface-variant line-through'}>{p.name}</td>
                      <td className="px-3 py-2 text-xs">
                        {p.conditions.length === 0 ? (
                          <span className="text-on-surface-variant">Todos</span>
                        ) : (
                          p.conditions.map((c, i) => (
                            <div key={i}>
                              {i > 0 && <span className="text-on-surface-variant">e </span>}
                              {describeCondition(c)}
                            </div>
                          ))
                        )}
                      </td>
                      <td className="max-w-72 px-3 py-2 text-on-surface-variant">“{p.phrase}”</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {s ? (
                          <>
                            {formatNumber(s.matched)} · <span className={s.matched > 0 && s.wins === 0 ? 'text-amber-700 dark:text-amber-300' : ''}>{formatNumber(s.wins)}</span>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                        <Switch checked={p.active} onChange={() => toggle.mutate(p)} label={p.active ? 'Desativar perfil' : 'Ativar perfil'} disabled={toggle.isPending} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editor && <PhraseProfileEditor key={editor.profile?.id ?? 'new'} profile={editor.profile} onClose={() => setEditor(null)} />}
    </div>
  );
}
