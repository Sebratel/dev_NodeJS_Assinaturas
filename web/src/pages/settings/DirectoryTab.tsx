import { useState } from 'react'
import { Field } from '../../components/ui/Field'
import { Input } from '../../components/ui/Input'
import { Switch } from '../../components/ui/Switch'
import type { Settings } from '../../types/api'
import { SaveBar } from './SaveBar'
import { useSaveSetting } from './useSaveSetting'

export function DirectoryTab({
  value,
}: {
  value: Settings['directory-filters']
}) {
  const [keywords, setKeywords] = useState(value.excludedOuKeywords.join(', '))
  const [requireEmail, setRequireEmail] = useState(value.requireEmail)
  const save = useSaveSetting('directory-filters')

  return (
    <div className="grid gap-4">
      <p className="text-sm text-on-surface-variant">
        Quais contas ativas do AD ficam de fora (contas de serviço, desativadas
        que ainda não saíram da OU etc.).
      </p>
      <Field
        label="Ignorar contas cujo caminho no AD contenha"
        hint="separe por vírgula"
        htmlFor="ou-keywords"
      >
        <Input
          id="ou-keywords"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <Switch
          checked={requireEmail}
          onChange={setRequireEmail}
          label="Exigir e-mail"
        />
        Ignorar contas sem e-mail
      </label>
      <SaveBar
        onSave={() =>
          save.mutate({
            excludedOuKeywords: keywords
              .split(',')
              .map((k) => k.trim())
              .filter(Boolean),
            requireEmail,
          })
        }
        pending={save.isPending}
        saved={save.isSuccess}
        error={save.error}
      />
    </div>
  )
}
