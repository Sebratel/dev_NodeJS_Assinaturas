import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { ConditionsEditor } from '../../components/rules/ConditionsEditor'
import { VariablesEditor } from '../../components/rules/VariablesEditor'
import { Button } from '../../components/ui/Button'
import { Drawer } from '../../components/ui/Drawer'
import { ReadOnlyNote } from '../../components/ui/ReadOnlyNote'
import { Field } from '../../components/ui/Field'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { Switch } from '../../components/ui/Switch'
import { usePermissions } from '../../hooks/usePermissions'
import { ApiError } from '../../services/api-client'
import { derivedQueryRoots, queryKeys } from '../../services/query-keys'
import { signatureRuleService } from '../../services/signature-rule.service'
import { signatureTemplateService } from '../../services/signature-template.service'
import type { SignatureRule } from '../../types/api'
import {
  emptyRuleForm,
  formToInput,
  ruleFormSchema,
  ruleToForm,
  type RuleFormValues,
} from './rule-form'
import { RuleImpact } from './RuleImpact'

interface RuleEditorProps {
  rule: SignatureRule | null
  initial?: RuleFormValues
  onClose: () => void
}

export function RuleEditor({ rule, initial, onClose }: RuleEditorProps) {
  const queryClient = useQueryClient()
  const { canEdit } = usePermissions()
  const templates = useQuery({
    queryKey: queryKeys.templates,
    queryFn: signatureTemplateService.list,
  })
  const [confirmDelete, setConfirmDelete] = useState(false)

  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleFormSchema),
    defaultValues: rule ? ruleToForm(rule) : (initial ?? emptyRuleForm()),
    mode: 'onChange',
  })
  const { register, control, handleSubmit, formState } = form
  const values = useWatch({ control }) as RuleFormValues
  const parsed = ruleFormSchema.safeParse(values)
  const draftReady =
    parsed.success ||
    (parsed.error?.issues ?? []).every((i) => i.path[0] === 'name')

  const afterChange = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.rules })
    derivedQueryRoots.forEach((queryKey) =>
      queryClient.invalidateQueries({ queryKey })
    )
    onClose()
  }
  const save = useMutation({
    mutationFn: (data: RuleFormValues) =>
      rule
        ? signatureRuleService.update(rule.id, formToInput(data))
        : signatureRuleService.create(formToInput(data)),
    onSuccess: afterChange,
  })
  const remove = useMutation({
    mutationFn: () => signatureRuleService.remove(rule!.id),
    onSuccess: afterChange,
  })

  const errors = formState.errors
  const apiError =
    save.error instanceof ApiError
      ? save.error
      : remove.error instanceof ApiError
        ? remove.error
        : null

  return (
    <Drawer
      open
      width="lg"
      onClose={onClose}
      title={!canEdit ? 'Regra' : rule ? 'Editar regra' : 'Nova regra'}
      subtitle="Todas as regras que valem se somam; em cada parte, vence a de prioridade maior."
      footer={
        !canEdit ? (
          <>
            <ReadOnlyNote className="mr-auto" />
            <Button onClick={onClose}>Fechar</Button>
          </>
        ) : (
          <>
            {rule &&
              (confirmDelete ? (
                <Button
                  variant="danger"
                  loading={remove.isPending}
                  onClick={() => remove.mutate()}
                  className="mr-auto"
                >
                  Confirmar exclusão
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  icon={<Trash2 className="size-4" />}
                  onClick={() => setConfirmDelete(true)}
                  className="mr-auto"
                >
                  Excluir
                </Button>
              ))}
            <Button onClick={onClose}>Cancelar</Button>
            <Button
              variant="primary"
              loading={save.isPending}
              onClick={handleSubmit((data) => save.mutate(data))}
            >
              Salvar regra
            </Button>
          </>
        )
      }
    >
      <form
        className="grid gap-4"
        onSubmit={handleSubmit((data) => canEdit && save.mutate(data))}
      >
        <fieldset
          disabled={!canEdit}
          className="m-0 grid min-w-0 gap-4 border-0 p-0"
        >
          {apiError && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900 dark:border-rose-800/50 dark:bg-rose-950/40 dark:text-rose-200">
              {apiError.message}{' '}
              {apiError.details.map((d) => d.message).join(' ')}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-[1fr_8rem_auto]">
            <Field
              label="Nome"
              htmlFor="rule-name"
              error={errors.name?.message}
            >
              <Input
                id="rule-name"
                {...register('name')}
                aria-invalid={Boolean(errors.name)}
                placeholder="Ex.: Líderes de vendas"
              />
            </Field>
            <Field
              label="Prioridade"
              htmlFor="rule-priority"
              error={errors.priority?.message}
            >
              <Input
                id="rule-priority"
                type="number"
                min={0}
                max={1000}
                {...register('priority', { valueAsNumber: true })}
                aria-invalid={Boolean(errors.priority)}
              />
            </Field>
            <Field label="Ativa">
              <div className="flex min-h-[44px] items-center">
                <Controller
                  control={control}
                  name="active"
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onChange={field.onChange}
                      label="Regra ativa"
                    />
                  )}
                />
              </div>
            </Field>
          </div>
          <Field
            label="Descrição"
            htmlFor="rule-description"
            error={errors.description?.message}
          >
            <Textarea
              id="rule-description"
              rows={2}
              {...register('description')}
              placeholder="Para quem é e por quê (opcional)"
            />
          </Field>

          <Controller
            control={control}
            name="conditions"
            render={({ field }) => (
              <ConditionsEditor
                conditions={field.value}
                onChange={(next) =>
                  form.setValue('conditions', next, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                errors={Object.fromEntries(
                  (field.value ?? []).map((_, i) => [
                    i,
                    errors.conditions?.[i]?.values?.message,
                  ])
                )}
              />
            )}
          />

          <section className="grid gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest p-3">
            <div>
              <h3 className="text-sm font-semibold">Define</h3>
              <p className="text-xs text-on-surface-variant">
                O modelo e o que entra em cada variável dele.
              </p>
            </div>
            <Field
              label="Modelo"
              htmlFor="out-template"
              hint="layout da assinatura"
            >
              <Select id="out-template" {...register('outputs.templateId')}>
                <option value="">não muda</option>
                {templates.data?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.isDefault ? ' (padrão)' : ''}
                  </option>
                ))}
              </Select>
            </Field>
            <Controller
              control={control}
              name="outputs.variables"
              render={({ field }) => (
                <VariablesEditor
                  value={field.value ?? {}}
                  templateId={values.outputs?.templateId ?? ''}
                  onChange={(next) =>
                    form.setValue('outputs.variables', next, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                  errors={Object.fromEntries(
                    Object.keys(field.value ?? {}).map((key) => [
                      key,
                      errors.outputs?.variables?.[key]?.text?.message,
                    ])
                  )}
                />
              )}
            />
            {errors.outputs?.root?.message && (
              <p className="text-xs text-rose-700 dark:text-rose-300">
                {errors.outputs.root.message}
              </p>
            )}
            {!errors.outputs?.root && errors.outputs?.message && (
              <p className="text-xs text-rose-700 dark:text-rose-300">
                {errors.outputs.message}
              </p>
            )}
          </section>
        </fieldset>

        <section className="grid gap-2 rounded-2xl border border-primary/25 bg-primary/10 p-3">
          <h3 className="text-sm font-semibold">Efeito</h3>
          <RuleImpact
            input={formToInput(values)}
            ruleId={rule?.id}
            ready={draftReady}
          />
        </section>
      </form>
    </Drawer>
  )
}
