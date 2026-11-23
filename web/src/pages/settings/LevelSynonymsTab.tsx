import { useState } from 'react'
import { Field } from '../../components/ui/Field'
import { Input } from '../../components/ui/Input'
import type { Level, Settings } from '../../types/api'
import { LEVEL_LABELS } from '../../utils/labels'
import { SaveBar } from './SaveBar'
import { useSaveSetting } from './useSaveSetting'

const LEVELS: Level[] = [
  'DIRECTOR',
  'MANAGER',
  'COORDINATOR',
  'SUPERVISOR',
  'LEADER',
  'AUXILIARY',
]

/** Primeira palavra do cargo → nível. O AD tem 205 grafias de cargo ("Aux", "Auxiliar", "Supervisor(a)"). */
export function LevelSynonymsTab({
  value,
}: {
  value: Settings['level-synonyms']
}) {
  const toText = (level: Level) =>
    value.find((s) => s.level === level)?.words.join(', ') ?? ''
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(LEVELS.map((l) => [l, toText(l)]))
  )
  const save = useSaveSetting('level-synonyms')

  const submit = () =>
    save.mutate(
      LEVELS.map((level) => ({
        level,
        words: draft[level]
          .split(',')
          .map((w) => w.trim())
          .filter(Boolean),
      }))
    )

  return (
    <div className="grid gap-4">
      <p className="text-sm text-on-surface-variant">
        O nível sai da{' '}
        <strong className="text-on-surface">primeira palavra do cargo</strong>{' '}
        no AD. Separe as variações por vírgula. Quem não casar com nenhuma vira{' '}
        <em>{LEVEL_LABELS.MEMBER}</em>.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {LEVELS.map((level) => (
          <Field
            key={level}
            label={LEVEL_LABELS[level]}
            htmlFor={`lvl-${level}`}
          >
            <Input
              id={`lvl-${level}`}
              value={draft[level]}
              onChange={(e) => setDraft({ ...draft, [level]: e.target.value })}
            />
          </Field>
        ))}
      </div>
      <SaveBar
        onSave={submit}
        pending={save.isPending}
        saved={save.isSuccess}
        error={save.error}
      />
    </div>
  )
}
