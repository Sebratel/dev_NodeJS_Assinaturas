import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Input, Select } from '../../components/ui/Input';
import type { Settings } from '../../types/api';
import { SaveBar } from './SaveBar';
import { useSaveSetting } from './useSaveSetting';

/** De-para de grafias de área e time (o AD escreve o mesmo time de jeitos diferentes). As frases ficam na tela Frases. */
export function TeamsTab({ aliases }: { aliases: Settings['value-aliases'] }) {
  const [aliasDraft, setAliasDraft] = useState(aliases);
  const saveAliases = useSaveSetting('value-aliases');
  const setAliasRow = (index: number, change: Partial<Settings['value-aliases'][number]>) =>
    setAliasDraft(aliasDraft.map((row, i) => (i === index ? { ...row, ...change } : row)));

  return (
    <section className="grid gap-3">
      <p className="text-sm text-on-surface-variant">
        Junta grafias diferentes do mesmo time ou área ("Suporte Tecnico" → "Suporte Técnico"). A correção definitiva é no Senior, que escreve no AD.
      </p>
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
  );
}
