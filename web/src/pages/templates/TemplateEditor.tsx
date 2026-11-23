import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlignLeft, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { SignaturePreview } from '../../components/signature/SignaturePreview'
import {
  TemplateCodeEditor,
  type TemplateCodeEditorHandle,
} from '../../components/templates/TemplateCodeEditor'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Drawer } from '../../components/ui/Drawer'
import { Field } from '../../components/ui/Field'
import { Input, Select } from '../../components/ui/Input'
import { Spinner } from '../../components/ui/Spinner'
import { Switch } from '../../components/ui/Switch'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { ApiError } from '../../services/api-client'
import { collaboratorService } from '../../services/collaborator.service'
import { derivedQueryRoots, queryKeys } from '../../services/query-keys'
import { signatureTemplateService } from '../../services/signature-template.service'
import type { SignatureTemplate, SignatureTemplateInput } from '../../types/api'
import { formatNumber } from '../../utils/format'
import { formatTemplateHtml } from '../../utils/format-template-html'

interface TemplateEditorProps {
  template: SignatureTemplate | null
  initial: SignatureTemplateInput
  onClose: () => void
}

/** Só os campos que a API aceita (o modelo da lista traz id e datas, que a API recusa). */
const toInput = (t: SignatureTemplateInput): SignatureTemplateInput => ({
  name: t.name,
  description: t.description,
  html: t.html,
  isDefault: t.isDefault,
})

export function TemplateEditor({
  template,
  initial,
  onClose,
}: TemplateEditorProps) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<SignatureTemplateInput>(() => ({
    ...toInput(initial),
    html: formatTemplateHtml(initial.html),
  }))
  const [confirmDelete, setConfirmDelete] = useState(false)
  const codeRef = useRef<TemplateCodeEditorHandle>(null)
  const variables = useQuery({
    queryKey: queryKeys.templateVariables,
    queryFn: signatureTemplateService.variables,
  })

  // Pessoa da prévia: busca por nome, começa pelo primeiro da lista.
  const [personSearch, setPersonSearch] = useState('')
  const debouncedPersonSearch = useDebouncedValue(personSearch)
  const people = useQuery({
    queryKey: queryKeys.collaborators({
      search: debouncedPersonSearch,
      page: 1,
      pageSize: 8,
    }),
    queryFn: () =>
      collaboratorService.list({
        search: debouncedPersonSearch,
        page: 1,
        pageSize: 8,
      }),
  })
  const [chosenPersonId, setPersonId] = useState('')
  // Escolhida, se ainda estiver na lista; senão a primeira. Busca sem resultado mantém a escolhida.
  const peopleItems = people.data?.items ?? []
  const personId =
    peopleItems.length === 0 || peopleItems.some((p) => p.id === chosenPersonId)
      ? chosenPersonId
      : peopleItems[0].id

  const debouncedHtml = useDebouncedValue(draft.html, 400)
  const preview = useQuery({
    queryKey: ['template-preview', debouncedHtml, personId],
    queryFn: () => signatureTemplateService.preview(debouncedHtml, personId),
    enabled: Boolean(personId && debouncedHtml.trim()),
    placeholderData: (previous) => previous,
  })

  const afterChange = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.templates })
    derivedQueryRoots.forEach((queryKey) =>
      queryClient.invalidateQueries({ queryKey })
    )
    onClose()
  }
  const save = useMutation({
    mutationFn: () =>
      template
        ? signatureTemplateService.update(template.id, toInput(draft))
        : signatureTemplateService.create(toInput(draft)),
    onSuccess: afterChange,
  })
  const remove = useMutation({
    mutationFn: () => signatureTemplateService.remove(template!.id),
    onSuccess: afterChange,
  })

  const apiError =
    save.error instanceof ApiError
      ? save.error
      : remove.error instanceof ApiError
        ? remove.error
        : null
  const problems = preview.data?.problems ?? []
  const tooLong =
    (preview.data?.htmlLength ?? 0) > (preview.data?.gmailLimit ?? Infinity)

  return (
    <Drawer
      open
      width="lg"
      onClose={onClose}
      title={template ? 'Editar modelo' : 'Novo modelo'}
      subtitle="HTML com tabelas e estilo inline (é o que o Gmail respeita). Texto do AD entra sempre escapado."
      footer={
        <>
          {template &&
            !template.isDefault &&
            (confirmDelete ? (
              <Button
                variant="danger"
                loading={remove.isPending}
                onClick={() => remove.mutate()}
              >
                Confirmar exclusão
              </Button>
            ) : (
              <Button
                variant="ghost"
                icon={<Trash2 className="size-4" />}
                onClick={() => setConfirmDelete(true)}
              >
                Excluir
              </Button>
            ))}
          <span
            className="mr-auto min-w-0 flex-1 text-xs text-rose-700 dark:text-rose-300"
            role="alert"
          >
            {apiError &&
              `${apiError.message} ${apiError.details.map((d) => d.message).join(' ')}`}
            {!apiError &&
              problems.length > 0 &&
              'Corrija os problemas do modelo para salvar.'}
          </span>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            loading={save.isPending}
            disabled={!draft.name.trim() || problems.length > 0}
            onClick={() => save.mutate()}
          >
            Salvar modelo
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Field label="Nome" htmlFor="tpl-name">
            <Input
              id="tpl-name"
              value={draft.name}
              maxLength={80}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </Field>
          <Field label="Padrão">
            <div className="flex min-h-[44px] items-center">
              <Switch
                checked={draft.isDefault}
                disabled={template?.isDefault}
                onChange={(isDefault) => setDraft({ ...draft, isDefault })}
                label={
                  template?.isDefault
                    ? 'É o padrão (escolha outro para trocar)'
                    : 'Usar como padrão'
                }
              />
            </div>
          </Field>
        </div>
        <Field label="Descrição" htmlFor="tpl-description">
          <Input
            id="tpl-description"
            value={draft.description}
            maxLength={300}
            onChange={(e) =>
              setDraft({ ...draft, description: e.target.value })
            }
            placeholder="Para quem é (opcional)"
          />
        </Field>

        <section className="grid gap-2 rounded-2xl border border-primary/25 bg-primary/10 p-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h3 className="text-sm font-semibold">Prévia</h3>
            <div className="flex flex-wrap items-center gap-1.5">
              <Input
                value={personSearch}
                onChange={(e) => setPersonSearch(e.target.value)}
                placeholder="Buscar pessoa"
                className="w-40"
                aria-label="Buscar pessoa da prévia"
              />
              <Select
                value={personId}
                onChange={(e) => setPersonId(e.target.value)}
                className="w-56"
                aria-label="Pessoa da prévia"
              >
                {people.data?.items.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          {preview.data ? (
            <SignaturePreview html={preview.data.html} />
          ) : (
            <Spinner />
          )}
          {preview.data && (
            <p
              className={`text-xs tabular-nums ${tooLong ? 'text-rose-700 dark:text-rose-300' : 'text-on-surface-variant'}`}
            >
              {formatNumber(preview.data.htmlLength)} de{' '}
              {formatNumber(preview.data.gmailLimit)} caracteres do Gmail
            </p>
          )}
          {problems.map((problem) => (
            <Badge
              key={problem}
              tone="danger"
              className="whitespace-normal py-1"
            >
              {problem}
            </Badge>
          ))}
        </section>

        <div className="grid gap-1.5">
          <div className="flex flex-wrap items-center gap-1">
            <span className="mr-1 text-xs font-medium">Inserir:</span>
            {variables.data?.map((v) => (
              <button
                key={v.key}
                type="button"
                title={v.description}
                onClick={() => codeRef.current?.insert(`{{${v.key}}}`)}
                className="rounded border border-outline-variant px-1.5 py-0.5 font-mono text-[11px] text-on-surface-variant hover:border-primary-ink hover:text-primary-ink"
              >
                {`{{${v.key}}}`}
              </button>
            ))}
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto"
              icon={<AlignLeft className="size-3.5" />}
              onClick={() =>
                setDraft({ ...draft, html: formatTemplateHtml(draft.html) })
              }
            >
              Organizar código
            </Button>
          </div>
          <p className="text-[11px] text-on-surface-variant">
            <code className="font-mono">{'{{#frase}}…{{/frase}}'}</code> só
            aparece se houver frase;{' '}
            <code className="font-mono">{'{{^frase}}…{{/frase}}'}</code> só se
            não houver. A indentação não conta no limite do Gmail.
          </p>
          <TemplateCodeEditor
            ref={codeRef}
            value={draft.html}
            onChange={(html) => setDraft((d) => ({ ...d, html }))}
          />
        </div>
      </div>
    </Drawer>
  )
}
