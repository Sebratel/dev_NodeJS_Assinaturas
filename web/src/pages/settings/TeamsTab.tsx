import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { collaboratorService } from '../../services/collaborator.service';
import { queryKeys } from '../../services/query-keys';
import type { Settings } from '../../types/api';
import { SaveBar } from './SaveBar';
import { useSaveSetting } from './useSaveSetting';

/** Frase por time + de-para de grafias de área e time (o AD escreve o mesmo time de jeitos diferentes). */
export function TeamsTab({ phrases, aliases }: { phrases: Settings['team-phrases']; aliases: Settings['value-aliases'] }) {
  const facets = useQuery({ queryKey: queryKeys.facets, queryFn: collaboratorService.facets });
  const teamOptions = [...new Set((facets.data?.teams ?? []).map((t) => t.team))];

  const [phraseDraft, setPhraseDraft] = useState(phrases);
  const [aliasDraft, setAliasDraft] = useState(aliases);
  const savePhrases = useSaveSetting('team-phrases');
  const saveAliases = useSaveSetting('value-aliases');

  const setPhraseRow = (index: number, change: Partial<{ team: string; phrase: string }>) =>
    setPhraseDraft({ ...phraseDraft, byTeam: phraseDraft.byTeam.map((row, i) => (i === index ? { ...row, ...change } : row)) });
  const setAliasRow = (index: number, change: Partial<Settings['value-aliases'][number]>) =>
    setAliasDraft(aliasDraft.map((row, i) => (i === index ? { ...row, ...change } : row)));

  return (
    <div className="grid gap-6">
      <section className="grid gap-3">
        <div>
          <h3 className="text-sm font-semibold">Frases</h3>
          <p className="text-xs text-on-surface-variant">Usadas pelas regras com "Frase do time". Time sem frase usa a padrão.</p>
        </div>
        <Field label="Frase padrão" htmlFor="default-phrase" hint={`${phraseDraft.defaultPhrase.length}/140`}>
          <Textarea id="default-phrase" rows={2} maxLength={140} value={phraseDraft.defaultPhrase} onChange={(e) => setPhraseDraft({ ...phraseDraft, defaultPhrase: e.target.value })} />
        </Field>
        {phraseDraft.byTeam.map((row, index) => (
          <div key={index} className="flex flex-wrap items-end gap-2">
            <Field label="Time" className="min-w-48 flex-1">
              <Select value={row.team} onChange={(e) => setPhraseRow(index, { team: e.target.value })}>
                <option value="">Escolha…</option>
                {teamOptions.map((team) => (
                  <option key={team}>{team}</option>
                ))}
              </Select>
            </Field>
            <Field label="Frase" className="min-w-64 flex-[2]">
              <Input maxLength={140} value={row.phrase} onChange={(e) => setPhraseRow(index, { phrase: e.target.value })} />
            </Field>
            <Button variant="ghost" aria-label="Tirar frase" onClick={() => setPhraseDraft({ ...phraseDraft, byTeam: phraseDraft.byTeam.filter((_, i) => i !== index) })}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <div>
          <Button size="sm" icon={<Plus className="size-3.5" />} onClick={() => setPhraseDraft({ ...phraseDraft, byTeam: [...phraseDraft.byTeam, { team: '', phrase: '' }] })}>
            Frase de um time
          </Button>
        </div>
        <SaveBar onSave={() => savePhrases.mutate(phraseDraft)} pending={savePhrases.isPending} saved={savePhrases.isSuccess} error={savePhrases.error} />
      </section>

      <section className="grid gap-3">
        <div>
          <h3 className="text-sm font-semibold">De-para de grafias</h3>
          <p className="text-xs text-on-surface-variant">
            Junta grafias diferentes do mesmo time ou área. A correção definitiva é no Senior, que escreve no AD.
          </p>
        </div>
        {aliasDraft.map((row, index) => (
          <div key={index} className="flex flex-wrap items-end gap-2">
            <Field label="Campo" className="w-28">
              <Select value={row.field} onChange={(e) => setAliasRow(index, { field: e.target.value as 'area' | 'team' })}>
                <option value="team">Time</option>
                <option value="area">Área</option>
              </Select>
            </Field>
            <Field label="Como está no AD" className="min-w-40 flex-1">
              <Input value={row.from} onChange={(e) => setAliasRow(index, { from: e.target.value })} />
            </Field>
            <Field label="Vira" className="min-w-40 flex-1">
              <Input value={row.to} onChange={(e) => setAliasRow(index, { to: e.target.value })} />
            </Field>
            <Button variant="ghost" aria-label="Tirar de-para" onClick={() => setAliasDraft(aliasDraft.filter((_, i) => i !== index))}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <div>
          <Button size="sm" icon={<Plus className="size-3.5" />} onClick={() => setAliasDraft([...aliasDraft, { field: 'team', from: '', to: '' }])}>
            De-para
          </Button>
        </div>
        <SaveBar onSave={() => saveAliases.mutate(aliasDraft)} pending={saveAliases.isPending} saved={saveAliases.isSuccess} error={saveAliases.error} />
      </section>
    </div>
  );
}
