import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ConditionsEditor } from '../../components/rules/ConditionsEditor';
import { Button } from '../../components/ui/Button';
import { Drawer } from '../../components/ui/Drawer';
import { Field } from '../../components/ui/Field';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { Switch } from '../../components/ui/Switch';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { ApiError } from '../../services/api-client';
import { derivedQueryRoots, queryKeys } from '../../services/query-keys';
import { phraseProfileService } from '../../services/phrase-profile.service';
import type { PhraseProfile, PhraseProfileInput } from '../../types/api';
import { cn } from '../../utils/cn';
import { formatNumber } from '../../utils/format';
import { LEVEL_LABELS } from '../../utils/labels';

const MAX = 140;
const VALUELESS = ['IS_EMPTY', 'IS_NOT_EMPTY'];

const empty: PhraseProfileInput = { name: '', priority: 10, active: true, conditions: [{ field: 'level', operator: 'IN', values: [] }], phrase: '' };

/** Cria ou edita um perfil de frase, com o efeito calculado enquanto se digita (nada é gravado até salvar). */
export function PhraseProfileEditor({ profile, onClose }: { profile: PhraseProfile | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<PhraseProfileInput>(() =>
    profile ? { name: profile.name, priority: profile.priority, active: profile.active, conditions: profile.conditions, phrase: profile.phrase } : empty,
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  const conditionErrors = Object.fromEntries(
    draft.conditions.map((c, i) => [i, !VALUELESS.includes(c.operator) && !c.values.some((v) => v.trim()) ? 'Escolha pelo menos um valor.' : undefined]),
  );
  const ready = draft.phrase.trim().length > 0 && draft.phrase.length <= MAX && Object.values(conditionErrors).every((e) => !e);

  // "Pronto" e o rascunho atrasam juntos: senão a simulação sai com um rascunho velho (ex.: ainda sem a frase).
  const debounced = useDebouncedValue(JSON.stringify({ ready, draft: { ...draft, name: draft.name || 'Rascunho', id: profile?.id } }), 400);
  const { ready: debouncedReady, draft: payload } = JSON.parse(debounced) as { ready: boolean; draft: PhraseProfileInput & { id?: string } };
  const impact = useQuery({
    queryKey: ['phrase-simulation', debounced],
    queryFn: () => phraseProfileService.simulate(payload),
    enabled: ready && debouncedReady,
  });

  const afterChange = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.phraseProfiles });
    derivedQueryRoots.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
    onClose();
  };
  const save = useMutation({
    mutationFn: () => (profile ? phraseProfileService.update(profile.id, draft) : phraseProfileService.create(draft)),
    onSuccess: afterChange,
  });
  const remove = useMutation({ mutationFn: () => phraseProfileService.remove(profile!.id), onSuccess: afterChange });
  const apiError = save.error instanceof ApiError ? save.error : remove.error instanceof ApiError ? remove.error : null;

  return (
    <Drawer
      open
      width="lg"
      onClose={onClose}
      title={profile ? 'Editar perfil de frase' : 'Novo perfil de frase'}
      subtitle="Quem casar com as condições usa esta frase (se nenhum perfil de prioridade maior também casar)."
      footer={
        <>
          {profile &&
            (confirmDelete ? (
              <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>
                Confirmar exclusão
              </Button>
            ) : (
              <Button variant="ghost" icon={<Trash2 className="size-4" />} onClick={() => setConfirmDelete(true)}>
                Excluir
              </Button>
            ))}
          <span className="mr-auto min-w-0 flex-1 text-xs text-rose-700 dark:text-rose-300" role="alert">
            {apiError && `${apiError.message} ${apiError.details.map((d) => d.message).join(' ')}`}
          </span>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" loading={save.isPending} disabled={!ready || !draft.name.trim()} onClick={() => save.mutate()}>
            Salvar perfil
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_8rem_auto]">
          <Field label="Nome" htmlFor="pf-name">
            <Input id="pf-name" value={draft.name} maxLength={80} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ex.: Diretoria técnica" />
          </Field>
          <Field label="Prioridade" htmlFor="pf-priority">
            <Input
              id="pf-priority"
              type="number"
              min={0}
              max={1000}
              value={draft.priority}
              onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) || 0 })}
            />
          </Field>
          <Field label="Ativo">
            <div className="flex min-h-11 items-center md:min-h-9">
              <Switch checked={draft.active} onChange={(active) => setDraft({ ...draft, active })} label="Perfil ativo" />
            </div>
          </Field>
        </div>

        <ConditionsEditor conditions={draft.conditions} onChange={(conditions) => setDraft({ ...draft, conditions })} errors={conditionErrors} emptyHint="Sem condição: vale para todos." />

        <Field label="Frase" htmlFor="pf-phrase" hint={`${draft.phrase.length}/${MAX}`} error={draft.phrase.length > MAX ? `Até ${MAX} caracteres.` : undefined}>
          <Input id="pf-phrase" value={draft.phrase} onChange={(e) => setDraft({ ...draft, phrase: e.target.value })} placeholder="Ex.: A rede inteira a gente garante." />
        </Field>

        <section className="grid gap-2 rounded-lg border border-primary-ink/20 bg-primary-soft/40 p-3">
          <h3 className="text-sm font-semibold">Efeito</h3>
          {!ready && <p className="text-xs text-on-surface-variant">Preencha as condições e a frase para ver quem o perfil pega.</p>}
          {ready && !impact.data && (
            <p className="flex items-center gap-2 text-xs text-on-surface-variant">
              <Spinner className="size-3.5" /> Calculando…
            </p>
          )}
          {ready && impact.data && (
            <>
              <p className="text-sm">
                Casa com <strong className="tabular-nums">{formatNumber(impact.data.matched)}</strong> pessoas e passa a decidir a frase de{' '}
                <strong className="tabular-nums">{formatNumber(impact.data.wins)}</strong>.
              </p>
              {impact.data.overridden > 0 && (
                <p className={cn('text-xs', impact.data.wins === 0 ? 'text-amber-800 dark:text-amber-200' : 'text-on-surface-variant')}>
                  {formatNumber(impact.data.overridden)} casam mas ficam com outra frase: regra com frase fixa ou sem frase, ou perfil de prioridade maior.
                </p>
              )}
              {impact.data.sample.length > 0 && (
                <ul className="grid gap-0.5 text-xs text-on-surface-variant">
                  {impact.data.sample.map((p) => (
                    <li key={p.id} className="truncate">
                      <span className="text-on-surface">{p.name}</span> · {p.team || 'sem time'} · {LEVEL_LABELS[p.level]} · antes: “{p.phraseBefore || 'sem frase'}”
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      </div>
    </Drawer>
  );
}
