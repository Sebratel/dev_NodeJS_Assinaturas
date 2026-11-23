import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { SignaturePreview } from '../../components/signature/SignaturePreview';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Drawer } from '../../components/ui/Drawer';
import { Field } from '../../components/ui/Field';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { Switch } from '../../components/ui/Switch';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { ApiError } from '../../services/api-client';
import { collaboratorService } from '../../services/collaborator.service';
import { derivedQueryRoots, queryKeys } from '../../services/query-keys';
import { signatureTemplateService } from '../../services/signature-template.service';
import type { SignatureTemplate, SignatureTemplateInput } from '../../types/api';
import { formatNumber } from '../../utils/format';

interface TemplateEditorProps {
  template: SignatureTemplate | null;
  initial: SignatureTemplateInput;
  onClose: () => void;
}

export function TemplateEditor({ template, initial, onClose }: TemplateEditorProps) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<SignatureTemplateInput>(initial);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const variables = useQuery({ queryKey: queryKeys.templateVariables, queryFn: signatureTemplateService.variables });

  // Pessoa da prévia: busca por nome, começa pelo primeiro da lista.
  const [personSearch, setPersonSearch] = useState('');
  const debouncedPersonSearch = useDebouncedValue(personSearch);
  const people = useQuery({
    queryKey: queryKeys.collaborators({ search: debouncedPersonSearch, page: 1, pageSize: 8 }),
    queryFn: () => collaboratorService.list({ search: debouncedPersonSearch, page: 1, pageSize: 8 }),
  });
  const [personId, setPersonId] = useState('');
  useEffect(() => {
    const first = people.data?.items[0]?.id;
    if (first && !people.data?.items.some((p) => p.id === personId)) setPersonId(first);
  }, [people.data, personId]);

  const debouncedHtml = useDebouncedValue(draft.html, 400);
  const preview = useQuery({
    queryKey: ['template-preview', debouncedHtml, personId],
    queryFn: () => signatureTemplateService.preview(debouncedHtml, personId),
    enabled: Boolean(personId && debouncedHtml.trim()),
    placeholderData: (previous) => previous,
  });

  const afterChange = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.templates });
    derivedQueryRoots.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
    onClose();
  };
  const save = useMutation({
    mutationFn: () => (template ? signatureTemplateService.update(template.id, draft) : signatureTemplateService.create(draft)),
    onSuccess: afterChange,
  });
  const remove = useMutation({ mutationFn: () => signatureTemplateService.remove(template!.id), onSuccess: afterChange });

  const insertVariable = (key: string) => {
    const area = textareaRef.current;
    const token = `{{${key}}}`;
    const start = area?.selectionStart ?? draft.html.length;
    const end = area?.selectionEnd ?? draft.html.length;
    const html = draft.html.slice(0, start) + token + draft.html.slice(end);
    setDraft({ ...draft, html });
    requestAnimationFrame(() => {
      area?.focus();
      area?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const apiError = save.error instanceof ApiError ? save.error : remove.error instanceof ApiError ? remove.error : null;
  const problems = preview.data?.problems ?? [];
  const tooLong = (preview.data?.htmlLength ?? 0) > (preview.data?.gmailLimit ?? Infinity);

  return (
    <Drawer
      open
      width="lg"
      onClose={onClose}
      title={template ? 'Editar modelo' : 'Novo modelo'}
      subtitle="HTML com tabelas e estilo inline (é o que o Gmail respeita). Texto do AD entra sempre escapado."
      footer={
        <>
          {template && !template.isDefault &&
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
          <Button variant="primary" loading={save.isPending} disabled={!draft.name.trim() || problems.length > 0} onClick={() => save.mutate()}>
            Salvar modelo
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {apiError && (
          <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900 dark:border-rose-800/50 dark:bg-rose-950/40 dark:text-rose-200">
            {apiError.message} {apiError.details.map((d) => d.message).join(' ')}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Field label="Nome" htmlFor="tpl-name">
            <Input id="tpl-name" value={draft.name} maxLength={80} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </Field>
          <Field label="Padrão">
            <div className="flex min-h-11 items-center md:min-h-9">
              <Switch
                checked={draft.isDefault}
                disabled={template?.isDefault}
                onChange={(isDefault) => setDraft({ ...draft, isDefault })}
                label={template?.isDefault ? 'É o padrão (escolha outro para trocar)' : 'Usar como padrão'}
              />
            </div>
          </Field>
        </div>
        <Field label="Descrição" htmlFor="tpl-description">
          <Input id="tpl-description" value={draft.description} maxLength={300} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Para quem é (opcional)" />
        </Field>

        <section className="grid gap-2 rounded-lg border border-primary-ink/20 bg-primary-soft/40 p-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h3 className="text-sm font-semibold">Prévia</h3>
            <div className="flex flex-wrap items-center gap-1.5">
              <Input value={personSearch} onChange={(e) => setPersonSearch(e.target.value)} placeholder="Buscar pessoa" className="w-40" aria-label="Buscar pessoa da prévia" />
              <Select value={personId} onChange={(e) => setPersonId(e.target.value)} className="w-56" aria-label="Pessoa da prévia">
                {people.data?.items.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          {preview.data ? <SignaturePreview html={preview.data.html} /> : <Spinner />}
          {preview.data && (
            <p className={`text-xs tabular-nums ${tooLong ? 'text-rose-700 dark:text-rose-300' : 'text-on-surface-variant'}`}>
              {formatNumber(preview.data.htmlLength)} de {formatNumber(preview.data.gmailLimit)} caracteres do Gmail
            </p>
          )}
          {problems.length > 0 && (
            <ul className="grid gap-1">
              {problems.map((problem) => (
                <li key={problem}>
                  <Badge tone="danger" className="whitespace-normal py-1">
                    {problem}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="grid gap-1.5">
          <div className="flex flex-wrap items-center gap-1">
            <span className="mr-1 text-xs font-medium">Inserir:</span>
            {variables.data?.map((v) => (
              <button
                key={v.key}
                type="button"
                title={v.description}
                onClick={() => insertVariable(v.key)}
                className="rounded border border-outline-variant px-1.5 py-0.5 font-mono text-[11px] text-on-surface-variant hover:border-primary-ink hover:text-primary-ink"
              >
                {`{{${v.key}}}`}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-on-surface-variant">
            <code className="font-mono">{'{{#frase}}…{{/frase}}'}</code> só aparece se houver frase; <code className="font-mono">{'{{^frase}}…{{/frase}}'}</code> só se não houver.
          </p>
          <Textarea
            ref={textareaRef}
            aria-label="HTML do modelo"
            value={draft.html}
            onChange={(e) => setDraft({ ...draft, html: e.target.value })}
            spellCheck={false}
            rows={16}
            className="font-mono text-xs leading-relaxed"
          />
        </div>
      </div>
    </Drawer>
  );
}
