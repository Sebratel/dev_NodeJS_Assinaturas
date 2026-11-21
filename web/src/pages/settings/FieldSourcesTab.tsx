import { useState } from 'react';
import { Field } from '../../components/ui/Field';
import { Input } from '../../components/ui/Input';
import type { Settings, SourceField } from '../../types/api';
import { SOURCE_FIELD_LABELS } from '../../utils/labels';
import { SaveBar } from './SaveBar';
import { useSaveSetting } from './useSaveSetting';

/** De onde vem cada campo: o nome do atributo no AD. Trocar aqui não exige mexer no código. */
export function FieldSourcesTab({ value }: { value: Settings['field-sources'] }) {
  const [draft, setDraft] = useState(value);
  const save = useSaveSetting('field-sources');

  return (
    <div className="grid gap-4">
      <p className="text-sm text-on-surface-variant">
        Nome do atributo do AD de onde cada campo é lido. Quando o celular, o ramal e o segmento ganharem campo no AD, é só apontar aqui.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(Object.keys(SOURCE_FIELD_LABELS) as SourceField[]).map((field) => (
          <Field key={field} label={SOURCE_FIELD_LABELS[field].label} hint={SOURCE_FIELD_LABELS[field].hint} htmlFor={`src-${field}`}>
            <Input
              id={`src-${field}`}
              value={draft[field]}
              onChange={(e) => setDraft({ ...draft, [field]: e.target.value.trim() })}
              className="font-mono text-xs"
              spellCheck={false}
            />
          </Field>
        ))}
      </div>
      <SaveBar onSave={() => save.mutate(draft)} pending={save.isPending} saved={save.isSuccess} error={save.error} />
    </div>
  );
}
