import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { ValuesInput } from '../../components/rules/ValuesInput';
import { Button } from '../../components/ui/Button';
import { Drawer } from '../../components/ui/Drawer';
import { Field } from '../../components/ui/Field';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { Switch } from '../../components/ui/Switch';
import { ApiError } from '../../services/api-client';
import { collaboratorService } from '../../services/collaborator.service';
import { derivedQueryRoots, queryKeys } from '../../services/query-keys';
import { signatureRuleService } from '../../services/signature-rule.service';
import { signatureTemplateService } from '../../services/signature-template.service';
import type { RuleField, RuleOperator, SignatureRule } from '../../types/api';
import { CONTACT_LABELS, FIELD_LABELS, OPERATOR_LABELS, PHONE0800_MODE_LABELS, PHRASE_MODE_LABELS, SECTOR_LABELS } from '../../utils/labels';
import { emptyRuleForm, formToInput, ruleFormSchema, ruleToForm, type RuleFormValues } from './rule-form';
import { RuleImpact } from './RuleImpact';

interface RuleEditorProps {
  rule: SignatureRule | null;
  initial?: RuleFormValues;
  onClose: () => void;
}

export function RuleEditor({ rule, initial, onClose }: RuleEditorProps) {
  const queryClient = useQueryClient();
  const facets = useQuery({ queryKey: queryKeys.facets, queryFn: collaboratorService.facets });
  const templates = useQuery({ queryKey: queryKeys.templates, queryFn: signatureTemplateService.list });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleFormSchema),
    defaultValues: rule ? ruleToForm(rule) : (initial ?? emptyRuleForm()),
    mode: 'onChange',
  });
  const { register, control, handleSubmit, formState } = form;
  const conditions = useFieldArray({ control, name: 'conditions' });
  const values = useWatch({ control }) as RuleFormValues;
  const parsed = ruleFormSchema.safeParse(values);
  const draftReady = parsed.success || (parsed.error?.issues ?? []).every((i) => i.path[0] === 'name');

  const afterChange = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.rules });
    derivedQueryRoots.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
    onClose();
  };
  const save = useMutation({
    mutationFn: (data: RuleFormValues) => (rule ? signatureRuleService.update(rule.id, formToInput(data)) : signatureRuleService.create(formToInput(data))),
    onSuccess: afterChange,
  });
  const remove = useMutation({ mutationFn: () => signatureRuleService.remove(rule!.id), onSuccess: afterChange });

  const suggestionsFor = (field: RuleField): string[] => {
    if (field === 'area') return facets.data?.areas ?? [];
    if (field === 'team') return [...new Set((facets.data?.teams ?? []).map((t) => t.team))];
    if (field === 'segment') return ['B2B'];
    return [];
  };
  const errors = formState.errors;
  const apiError = save.error instanceof ApiError ? save.error : remove.error instanceof ApiError ? remove.error : null;

  return (
    <Drawer
      open
      width="lg"
      onClose={onClose}
      title={rule ? 'Editar regra' : 'Nova regra'}
      subtitle="Todas as regras que valem se somam; em cada parte, vence a de prioridade maior."
      footer={
        <>
          {rule &&
            (confirmDelete ? (
              <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate()} className="mr-auto">
                Confirmar exclusão
              </Button>
            ) : (
              <Button variant="ghost" icon={<Trash2 className="size-4" />} onClick={() => setConfirmDelete(true)} className="mr-auto">
                Excluir
              </Button>
            ))}
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" loading={save.isPending} onClick={handleSubmit((data) => save.mutate(data))}>
            Salvar regra
          </Button>
        </>
      }
    >
      <form className="grid gap-4" onSubmit={handleSubmit((data) => save.mutate(data))}>
        {apiError && (
          <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900 dark:border-rose-800/50 dark:bg-rose-950/40 dark:text-rose-200">
            {apiError.message} {apiError.details.map((d) => d.message).join(' ')}
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-[1fr_8rem_auto]">
          <Field label="Nome" htmlFor="rule-name" error={errors.name?.message}>
            <Input id="rule-name" {...register('name')} aria-invalid={Boolean(errors.name)} placeholder="Ex.: Líderes de vendas" />
          </Field>
          <Field label="Prioridade" htmlFor="rule-priority" error={errors.priority?.message}>
            <Input id="rule-priority" type="number" min={0} max={1000} {...register('priority', { valueAsNumber: true })} aria-invalid={Boolean(errors.priority)} />
          </Field>
          <Field label="Ativa">
            <div className="flex min-h-11 items-center md:min-h-9">
              <Controller control={control} name="active" render={({ field }) => <Switch checked={field.value} onChange={field.onChange} label="Regra ativa" />} />
            </div>
          </Field>
        </div>
        <Field label="Descrição" htmlFor="rule-description" error={errors.description?.message}>
          <Textarea id="rule-description" rows={2} {...register('description')} placeholder="Para quem é e por quê (opcional)" />
        </Field>

        <section className="grid gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Quando</h3>
            <Button size="sm" icon={<Plus className="size-3.5" />} onClick={() => conditions.append({ field: 'team', operator: 'IN', values: [] })}>
              Condição
            </Button>
          </div>
          {conditions.fields.length === 0 && <p className="text-xs text-on-surface-variant">Sem condição: vale para todos os colaboradores.</p>}
          {conditions.fields.map((item, index) => {
            const current = values.conditions?.[index];
            const valueless = current?.operator === 'IS_EMPTY' || current?.operator === 'IS_NOT_EMPTY';
            return (
              <div key={item.id} className="grid gap-1.5 border-t border-outline-variant pt-2 first-of-type:border-t-0 first-of-type:pt-0">
                {index > 0 && <span className="text-[11px] font-medium text-on-surface-variant">e</span>}
                <div className="flex flex-wrap gap-1.5">
                  <Select
                    aria-label="Campo"
                    className="w-auto min-w-28"
                    {...register(`conditions.${index}.field`, { onChange: () => form.setValue(`conditions.${index}.values`, []) })}
                  >
                    {(Object.keys(FIELD_LABELS) as RuleField[]).map((f) => (
                      <option key={f} value={f}>
                        {FIELD_LABELS[f]}
                      </option>
                    ))}
                  </Select>
                  <Select aria-label="Operador" className="w-auto min-w-32" {...register(`conditions.${index}.operator`)}>
                    {(Object.keys(OPERATOR_LABELS) as RuleOperator[]).map((op) => (
                      <option key={op} value={op}>
                        {OPERATOR_LABELS[op]}
                      </option>
                    ))}
                  </Select>
                  <Button variant="ghost" size="sm" className="ml-auto" onClick={() => conditions.remove(index)} aria-label="Tirar condição">
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                {!valueless && current && (
                  <Controller
                    control={control}
                    name={`conditions.${index}.values`}
                    render={({ field }) => (
                      <ValuesInput
                        field={current.field}
                        values={field.value}
                        onChange={field.onChange}
                        suggestions={suggestionsFor(current.field)}
                        invalid={Boolean(errors.conditions?.[index]?.values)}
                      />
                    )}
                  />
                )}
                {errors.conditions?.[index]?.values?.message && <p className="text-xs text-rose-700 dark:text-rose-300">{errors.conditions[index]?.values?.message}</p>}
              </div>
            );
          })}
        </section>

        <section className="grid gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-3">
          <div>
            <h3 className="text-sm font-semibold">Define</h3>
            <p className="text-xs text-on-surface-variant">Deixe "não muda" no que esta regra não decide.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="0800" htmlFor="out-0800-mode" error={errors.outputs?.phone0800?.message}>
              <div className="flex gap-1.5">
                <Select id="out-0800-mode" {...register('outputs.phone0800Mode')} className={values.outputs?.phone0800Mode === 'FIXED' ? 'w-36 shrink-0' : ''}>
                  <option value="">não muda</option>
                  {Object.entries(PHONE0800_MODE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
                {values.outputs?.phone0800Mode === 'FIXED' && (
                  <Input aria-label="Número do 0800" {...register('outputs.phone0800')} placeholder="0800 365 8000" aria-invalid={Boolean(errors.outputs?.phone0800)} />
                )}
              </div>
            </Field>
            <Field label="Contato" htmlFor="out-contact">
              <Select id="out-contact" {...register('outputs.contact')}>
                <option value="">não muda</option>
                {Object.entries(CONTACT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Antes do cargo, mostrar" htmlFor="out-sector">
              <Select id="out-sector" {...register('outputs.sectorLabel')}>
                <option value="">não muda</option>
                {Object.entries(SECTOR_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Frase" htmlFor="out-phrase">
              <Select id="out-phrase" {...register('outputs.phraseMode')}>
                <option value="">não muda</option>
                {Object.entries(PHRASE_MODE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            {values.outputs?.phraseMode === 'FIXED' && (
              <Field label="Texto da frase" htmlFor="out-phrase-text" hint="até 140" error={errors.outputs?.phraseText?.message} className="sm:col-span-2">
                <Input id="out-phrase-text" maxLength={140} {...register('outputs.phraseText')} />
              </Field>
            )}
            <Field label="Modelo" htmlFor="out-template" hint="layout da assinatura" className="sm:col-span-2">
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
          </div>
          {errors.outputs?.root?.message && <p className="text-xs text-rose-700 dark:text-rose-300">{errors.outputs.root.message}</p>}
          {!errors.outputs?.root && errors.outputs?.message && <p className="text-xs text-rose-700 dark:text-rose-300">{errors.outputs.message}</p>}
        </section>

        <section className="grid gap-2 rounded-lg border border-primary-ink/20 bg-primary-soft/40 p-3">
          <h3 className="text-sm font-semibold">Efeito</h3>
          <RuleImpact input={formToInput(values)} ruleId={rule?.id} ready={draftReady} />
        </section>
      </form>
    </Drawer>
  );
}
